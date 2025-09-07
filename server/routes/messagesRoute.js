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
        const newMessage = new Message({ senderId, receiverId, text, image });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        console.error("Error creating message:", err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET messages for a conversation
router.get('/get/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: currentUserId, receiverId: contactId },
                { senderId: contactId, receiverId: currentUserId }
            ],
            // Add your logic for hidden/cleared messages here if needed
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

// DELETE a message
router.delete('/delete/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        if (message.senderId.toString() !== currentUserId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this message' });
        }
        message.isDeleted = true;
        message.text = "This message was deleted";
        message.image = null;
        message.starredBy = [];
        await message.save();
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (err) {
        console.error("Error deleting message:", err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// STAR or UNSTAR a message
router.post('/star/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id.toString();
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        const isStarred = message.starredBy.includes(currentUserId);
        if (isStarred) {
            message.starredBy = message.starredBy.filter(id => id !== currentUserId);
        } else {
            message.starredBy.push(currentUserId);
        }
        await message.save();
        res.status(200).json({ message: 'Star status updated' });
    } catch (err) {
        console.error("Error updating star status:", err);
        res.status(500).json({ error: 'Failed to update star status' });
    }
});

// HIDE a message
router.post('/hide/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const currentUserId = req.user._id;
        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { hiddenFor: currentUserId }
        });
        res.status(200).json({ message: 'Message hidden' });
    } catch (err) {
        console.error("Error hiding message:", err);
        res.status(500).json({ error: 'Failed to hide message' });
    }
});

// CLEAR chat history
router.post('/clear/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const currentUserId = req.user._id.toString();
        await Message.updateMany(
            {
                $or: [
                    { senderId: currentUserId, receiverId: contactId },
                    { senderId: contactId, receiverId: currentUserId }
                ],
                starredBy: { $ne: currentUserId }
            },
            { $addToSet: { hiddenFor: currentUserId } }
        );
        res.status(200).json({ message: 'Chat history cleared' });
    } catch (err) {
        console.error("Error clearing chat:", err);
        res.status(500).json({ error: 'Failed to clear chat' });
    }
});

export default router;