import express from 'express';
import User from '../models/users-model.js';
import Message from '../models/messages-model.js';

const router = express.Router();
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};
router.use(isAuthenticated);

// 1. SEND A FRIEND REQUEST
router.post('/send-request', async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        const senderId = req.user._id;

        const recipient = await User.findOne({ email: recipientEmail });

        // --- VALIDATION ---
        if (!recipient) return res.status(404).json({ error: 'User with that email not found' });
        if (recipient._id.equals(senderId)) return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
        if (req.user.friends.some(friendId => friendId.equals(recipient._id))) {
            return res.status(400).json({ error: 'You are already friends with this user' });
        }
        if (req.user.friendRequestsSent.some(reqId => reqId.equals(recipient._id))) {
            return res.status(400).json({ error: 'Friend request already sent' });
        }
        if (req.user.friendRequestsReceived.some(reqId => reqId.equals(recipient._id))) {
             return res.status(400).json({ error: 'This user has already sent you a request' });
        }

        // --- UPDATE BOTH USERS ---
        // Using Promise.all to update both documents in parallel for efficiency
        await Promise.all([
            User.findByIdAndUpdate(senderId, { $addToSet: { friendRequestsSent: recipient._id } }),
            User.findByIdAndUpdate(recipient._id, { $addToSet: { friendRequestsReceived: senderId } })
        ]);

        // --- REAL-TIME NOTIFICATION ---
        const io = req.io;
        // Populate the sender's info before emitting
        const senderInfo = { _id: req.user._id, name: req.user.name, picture: req.user.picture };
        io.to(recipient._id.toString()).emit('newFriendRequest', senderInfo);

        res.status(200).json({ message: 'Friend request sent successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});


// 2. ACCEPT A FRIEND REQUEST
router.post('/accept-request/:requesterId', async (req, res) => {
    try {
        const { requesterId } = req.params;
        const recipient = req.user;

        const requester = await User.findById(requesterId);
        if (!requester) {
            return res.status(404).json({ error: "Requester not found." });
        }

        await Promise.all([
            User.findByIdAndUpdate(recipient._id, {
                $pull: { friendRequestsReceived: requesterId },
                $addToSet: { friends: requesterId }
            }),
            User.findByIdAndUpdate(requesterId, {
                $pull: { friendRequestsSent: recipient._id },
                $addToSet: { friends: recipient._id }
            })
        ]);

        // --- REAL-TIME NOTIFICATION FOR ACCEPTANCE ---
        const io = req.io;
        const accepterInfo = { _id: recipient._id, name: recipient.name, picture: recipient.picture };
        // Notify the original requester that their request was accepted.
        io.to(requesterId).emit('requestAccepted', accepterInfo);

        // Notification #2: Tell the person who just accepted (User B) that they have a new friend.
        // We send them the requester's information so they can add it to their UI instantly.
        const requesterInfo = { _id: requester._id, name: requester.name, picture: requester.picture };
        io.to(recipient._id.toString()).emit('friendListUpdated', requesterInfo);

        res.status(200).json({ message: 'Friend request accepted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

// 3. REJECT A FRIEND REQUEST
router.post('/reject-request/:requesterId', async (req, res) => {
    try {
        const { requesterId } = req.params;
        const recipientId = req.user._id;

        // Just remove from the sent/received arrays. Do not add to friends.
        await Promise.all([
            User.findByIdAndUpdate(recipientId, { $pull: { friendRequestsReceived: requesterId } }),
            User.findByIdAndUpdate(requesterId, { $pull: { friendRequestsSent: recipientId } })
        ]);

        res.status(200).json({ message: 'Friend request rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject friend request' });
    }
});

// 4. GET PENDING FRIEND REQUESTS
router.get('/requests', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friendRequestsReceived', 'name picture email');
        res.status(200).json(user.friendRequestsReceived);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch friend requests' });
    }
});


// 5. GET THE USER'S FRIEND LIST
router.get('/list', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends', 'name picture email');
        res.status(200).json(user.friends);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

// 6. UNFRIEND A USER
router.post('/unfriend/:friendId', async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user._id;

        // --- Using Promise.all to perform all database operations concurrently ---
        await Promise.all([
            // Operation 1: Remove friendId from the current user's friend list
            User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),

            // Operation 2: Remove the current user's ID from the friend's list
            User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),

            // --- STEP 3: Delete the entire conversation between the two users ---
            Message.deleteMany({
                $or: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId }
                ]
            })
        ]);

        res.status(200).json(User.friends);
    } catch (err) {
        res.status(500).json({ error: 'Failed to unfriend' });
    }
});

export default router;