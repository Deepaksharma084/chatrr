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
            $or: [
                { senderId: currentUserId, receiverId: receiverId },
                { senderId: receiverId, receiverId: currentUserId }
            ],
            // THIS IS THE CRITICAL FILTER:
            // Only get messages where the `clearedBy` array does NOT include the current user's ID.
            clearedBy: { $nin: [currentUserId] }
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
        const message = await Message.findById(messageId);

        // Security check: Ensure the message exists and was sent by the current user
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        if (message.senderId.toString() !== currentUserId.toString()) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        // Update the message instead of deleting it
        message.text = "This message was deleted";
        message.isDeleted = true;

        const updatedMessage = await message.save();

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
            ]
        };

        // Stage 1: Mark messages as cleared by the current user.
        await Message.updateMany(
            conversationFilter,
            { $addToSet: { clearedBy: currentUserId } }
        );

        // Stage 2: After marking, find and delete any messages that have now been
        // cleared by BOTH users involved in the conversation.
        await Message.deleteMany({
            ...conversationFilter,
            clearedBy: { $all: [currentUserId, contactId] }
        });

        res.status(200).json({ message: 'Chat cleared successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to clear chat' });
    }
});

export default router;