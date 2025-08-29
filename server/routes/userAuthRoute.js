import express from 'express';
import passport from 'passport';
import User from '../models/users-model.js';
import Message from '../models/messages-model.js';
import mongoose from 'mongoose';

const router = express.Router();

// Initiate Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Handle Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:5173/messenger',
    failureRedirect: 'http://localhost:5173/',
  })
);

// Logout route
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.clearCookie('connect.sid'); // The default session cookie name
    res.redirect('http://localhost:5173/'); // Redirect to frontend
  });
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ googleId: { $exists: true, $ne: null } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/check-auth', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true, user: req.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

router.post('/delete', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Getting the io instance from the request object ,which was set in the index.js file
  const io = req.io;

  try {
    const userId = req.user._id;

    await Promise.all([
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      User.findByIdAndDelete(userId)
    ]);

    // After successful deletion, broadcast the event to all connected clients
    io.emit('accountDeleted', { deletedUserId: userId });
    console.log(`Emitted 'accountDeleted' for user ${userId}`);

    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Account deleted, but logout failed.' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Account deleted successfully' });
    });

  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: 'Failed to delete account and associated data' });
  }
});

router.get('/selectedUserProfile/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const selectedUserId = req.params._id
    const selectedUser = mongoose.User.find({ _id: selectedUserId })
    res.json(selectedUser)
  } catch (err) {
    console.error("Error finding the selected user profile", err)
    res.status(500).json({ error: 'Failed to fetch selected user profile' });
  }
});

export default router;