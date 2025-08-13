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
        const messages = await Message.find({
            $or: [
                { senderId: req.user._id, receiverId },
                { senderId: receiverId, receiverId: req.user._id }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;