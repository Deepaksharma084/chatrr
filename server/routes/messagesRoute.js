import express from 'express';
import Message from '../models/messages-model.js';

const router = express.Router();

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// Apply authentication check to all message routes
router.use(isAuthenticated);

router.post('/create', async (req, res) => {
    try {
        const { senderId, receiverId, text, image } = req.body;

        // Validate required fields
        if (!senderId || !receiverId || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image
        });

        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);

    } catch (error) {
        console.error('Message creation error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.get('/get/:receiverId', async (req, res) => {
    try {
        const { receiverId } = req.params;
        const currentUserId = req.user._id;

        const messages = await Message.find({
            // First, find all messages in the conversation
            $or: [
                { senderId: currentUserId, receiverId: receiverId },
                { senderId: receiverId, receiverId: currentUserId }
            ],
            // Then, apply the critical filter for visibility
            $or: [
                // Condition 1: The message is visible if I have NOT cleared it.
                { clearedBy: { $nin: [currentUserId] } },
                // OR Condition 2: The message is ALSO visible if I HAVE starred it (overriding the clear).
                { starredBy: { $in: [currentUserId] } }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/mark-read/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id;

        // here this is mongoose query to update multiple documents
        //syntax-SomeDoc.updateMany(filter, update)
        //filter = which documents (messages) to find.
        //update = what to change in those documents.
        await Message.updateMany(
            { senderId: contactId, receiverId: currentUserId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: 'Messages marked as read' });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to update messages' });
    }
});

router.delete('/delete/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;

        // Find the message
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
                // Set the new values for these fields...
                $set: {
                    text: "This message was deleted",
                    isDeleted: true
                },
                // AND pull/remove the current user's ID from the `starredBy` array.
                $pull: {
                    starredBy: currentUserId
                }
            },
            { new: true } // This option returns the updated document
        );

        res.status(200).json(updatedMessage);

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

router.post('/clear/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id;

        const conversationFilter = {
            $or: [
                { senderId: currentUserId, receiverId: contactId },
                { senderId: contactId, receiverId: currentUserId }
            ],
            // CRITICAL ADDITION: Never affect messages starred by the current user.
            starredBy: { $nin: [currentUserId] }
        };

        // Stage 1: Add user's ID to the `clearedBy` array for all non-starred messages.
        await Message.updateMany(
            conversationFilter,
            { $addToSet: { clearedBy: currentUserId } }
        );

        // Stage 2: Delete messages only if BOTH users have cleared them AND no one has starred them.
        await Message.deleteMany({
            ...conversationFilter, // This already excludes starred messages
            clearedBy: { $all: [currentUserId, contactId] },
            starredBy: { $size: 0 } // Extra safety: only delete if NO ONE has starred it.
        });

        res.status(200).json({ message: 'Chat cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear chat' });
    }
});

router.post('/star/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Check if the user's ID is already in the `starredBy` array
        const userIndex = message.starredBy.indexOf(currentUserId);

        if (userIndex > -1) {
            // If it exists, remove it (unstar)
            message.starredBy.splice(userIndex, 1);
        } else {
            // If it doesn't exist, add it (star)
            message.starredBy.push(currentUserId);
        }

        const updatedMessage = await message.save();
        res.status(200).json(updatedMessage);

    } catch (error) {
        res.status(500).json({ error: "Failed to update star status" });
    }
});

export default router;