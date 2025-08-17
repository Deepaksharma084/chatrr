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

import '../config/passport.js';
import userAuthRoute from '../routes/userAuthRoute.js';
import messagesRoute from '../routes/messagesRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://192.168.1.8:5173'
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
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- SOCKET.IO SETUP AND MIDDLEWARE INJECTION ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// attaching the `io` instance to every request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// NOW defining routes, which will have access to `req.io`
app.use('/auth', userAuthRoute);
app.use('/msg', messagesRoute);

// --- SOCKET.IO EVENT LISTENERS ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log('User joined room:', userId);
  });

  socket.on('sendMessage', (message) => {
    io.to(message.receiverId).emit('receiveMessage', message);
  });

  socket.on('typing', (data) => {
    // thee 'data' here is the object { senderId, receiverId } from Step 1
    io.to(data.receiverId).emit('typing', data); 
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- DATABASE CONNECTION AND SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // START THE CORRECT SERVER (httpServer) HERE
    httpServer.listen(PORT, () => {
      console.log("Server with Socket.IO is running on PORT: " + PORT);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });