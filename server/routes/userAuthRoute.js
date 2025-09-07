import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/users-model.js';
import Message from '../models/messages-model.js';
import protectRoute from '../middleware/protectRoute.js';

const router = express.Router();

// Initiate Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Handle Google OAuth callback and create JWT
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/`, // Redirect to login on failure
    session: false // We are not using sessions
  }),
  (req, res) => {
    // On success, create a token for the user
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15d' }
    );
    // Redirect to a special frontend route to handle the token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

router.get('/logout', (req, res) => {
  // With JWT, the backend doesn't need to do anything for logout.
  // The client simply deletes the token from its storage.
  res.status(200).json({ message: "Logout endpoint called successfully." });
});

router.get('/check-auth', protectRoute, (req, res) => {
  // If the protectRoute middleware passes, it means the token is valid.
  // We send back the user data attached to req.user.
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

router.get('/selectedUserProfile/:id', protectRoute, async (req, res) => {
  try {
    const selectedUserId = req.params.id;
    const selectedUser = await User.findById(selectedUserId).select('-password');

    if (!selectedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(selectedUser);

  } catch (err) {
    console.error("Error finding the selected user profile", err);
    res.status(500).json({ error: 'Failed to fetch selected user profile' });
  }
});

router.post('/delete', protectRoute, async (req, res) => {
  const io = req.io;

  try {
    // The user's ID comes from the protectRoute middleware (from the decoded token)
    const userId = req.user._id;

    // Delete messages and the user
    await Promise.all([
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      User.findByIdAndDelete(userId)
    ]);

    // Broadcast the account deletion to all connected clients
    io.emit('accountDeleted', { deletedUserId: userId });
    console.log(`Emitted 'accountDeleted' for user ${userId}`);

    res.status(200).json({ message: 'Account deleted successfully' });

  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: 'Failed to delete account and associated data' });
  }
});


export default router;