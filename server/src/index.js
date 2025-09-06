import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { Server } from 'socket.io';
import { createServer } from 'http';
import MongoStore from 'connect-mongo';

import '../config/passport.js';
import userAuthRoute from '../routes/userAuthRoute.js';
import messagesRoute from '../routes/messagesRoute.js';
import friendsRoute from '../routes/friendsRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  process.env.FRONTEND_URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'a secret key',
  resave: false,
  saveUninitialized: true,
  proxy: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 15 * 24 * 60 * 60 // = 15 days. Sessions will be deleted automatically after this period.
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 15 * 24 * 60 * 60 * 1000 // Cookie expiration should match ttl
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.use('/auth', userAuthRoute);
app.use('/msg', messagesRoute);
app.use('/friends', friendsRoute);

// --- ONLINE USER TRACKING ---
// This object will be our single source of truth for who is online.
// The key is the userId, and the value will be the user's latest socket.id.
let onlineUsers = {};


// --- ALL SOCKET.IO EVENT LISTENERS MUST BE INSIDE THIS BLOCK ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // This listener is triggered when a user logs in and their client sends their ID.
  socket.on('join', (userId) => {
    // --- START: ONLINE STATUS LOGIC (ADD USER) ---
    socket.join(userId);
    socket.userId = userId; // CRITICAL: Associate the userId with this specific socket connection.
    onlineUsers[userId] = socket.id; // Add the user to our list of online users.

    // Broadcast the updated list of online users to EVERYONE.
    io.emit('onlineUsers', Object.keys(onlineUsers));
    console.log('[JOIN] Online users:', Object.keys(onlineUsers));
  });

  // Listener for when a client sends a new message.
  socket.on('sendMessage', (message) => {
    io.to(message.receiverId).emit('receiveMessage', message);
  });

  // Listener for when a client is typing.
  socket.on('typing', (data) => {
    io.to(data.receiverId).emit('typing', data);
  });

  // Listener for when a message has been read by the receiver.
  socket.on('mark-as-read', (data) => {
    io.to(data.contactId).emit('messages-read', { readerId: data.currentUserId });
  });

  // Listener for when a message has been deleted.
  socket.on('deleteMessage', (data) => {
    io.to(data.receiverId).emit('messageDeleted', { messageId: data.messageId });
  });

  // This is the special listener for when a user's connection is lost (e.g., they close the tab).
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // --- START: ONLINE STATUS LOGIC (REMOVE USER) ---
    // The `socket.userId` we stored earlier is crucial here.
    if (socket.userId) {
      delete onlineUsers[socket.userId]; // Remove the user from our list.

      // Broadcast the final, updated list of online users to EVERYONE.
      io.emit('onlineUsers', Object.keys(onlineUsers));
      console.log('[DISCONNECT] Online users:', Object.keys(onlineUsers));
    }
  });
});


// --- DATABASE CONNECTION AND SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log("Server with Socket.IO is running on PORT: " + PORT);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });