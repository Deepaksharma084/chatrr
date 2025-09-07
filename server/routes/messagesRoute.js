import express from 'express';
import Message from '../models/messages-model.js';
import protectRoute from '../middleware/protectRoute.js';

const router = express.Router();

// Apply the protectRoute middleware to ALL routes in this file.
router.use(protectRoute);

// CREATE a new message
router.post('/create', async (req, res) => {
    try {
        const { receiverId, text, image } = req.body;
        const senderId = req.user._id;

        if (!receiverId || (!text && !image)) {
            return res.status(400).json({ error: 'Missing required fields or message content' });
        }
        const newMessage = new Message({ senderId, receiverId, text: text || "", image });
        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (err) {
        console.error("Error creating message:", err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET messages for a conversation
router.get('/get/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id; // Using ObjectId is fine here as Mongoose handles casting

        const messages = await Message.find({
            // Condition 1: Message is between the two users.
            $or: [
                { senderId: currentUserId, receiverId: contactId },
                { senderId: contactId, receiverId: currentUserId }
            ],
            // Condition 2: EITHER the message is not cleared by me, OR it is starred by me.
            $or: [
                { clearedBy: { $nin: [currentUserId] } },
                { starredBy: { $in: [currentUserId] } }
            ]
        }).sort({ timestamp: 1 });

        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// MARK messages as read
router.post('/mark-read/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id;
        await Message.updateMany(
            { senderId: contactId, receiverId: currentUserId, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: 'Messages marked as read' });
    } catch (err) {
        console.error("Error marking messages as read:", err);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// DELETE a message (soft delete)
router.delete('/delete/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
                $set: { text: "This message was deleted", isDeleted: true, image: null },
                $pull: { starredBy: currentUserId }
            },
            { new: true }
        );
        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// HIDE a single message (for the current user)
router.post('/hide/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;
        await Message.findByIdAndUpdate(
            messageId,
            {
                $addToSet: { clearedBy: currentUserId },
                $pull: { starredBy: currentUserId }
            }
        );
        res.status(200).json({ message: 'Message hidden successfully' });
    } catch (err) {
        console.error('Error hiding message:', err);
        res.status(500).json({ error: 'Failed to hide message' });
    }
});

// STAR or UNSTAR a message
router.post('/star/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        const userIndex = message.starredBy.indexOf(currentUserId);
        if (userIndex > -1) {
            message.starredBy.splice(userIndex, 1);
        } else {
            message.starredBy.push(currentUserId);
        }
        const updatedMessage = await message.save();
        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error("Error updating star status:", err);
        res.status(500).json({ error: "Failed to update star status" });
    }
});

// CLEAR chat history
router.post('/clear/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id;

        const conversationFilter = {
            $or: [
                { senderId: currentUserId, receiverId: contactId },
                { senderId: contactId, receiverId: currentUserId }
            ]
        };

        // Stage 1: Hide all non-starred messages for the current user.
        await Message.updateMany(
            { ...conversationFilter, starredBy: { $nin: [currentUserId] } },
            { $addToSet: { clearedBy: currentUserId } }
        );

        // Stage 2: Permanently delete messages cleared by both users and not starred by anyone.
        await Message.deleteMany({
            ...conversationFilter,
            clearedBy: { $all: [currentUserId, contactId] },
            starredBy: { $size: 0 }
        });

        res.status(200).json({ message: 'Chat cleared successfully' });
    } catch (err) {
        console.error("Error clearing chat:", err);
        res.status(500).json({ error: 'Failed to clear chat' });
    }
});

export default router;