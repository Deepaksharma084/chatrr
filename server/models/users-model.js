import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String,
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);