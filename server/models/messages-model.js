import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    image: { type: String },
    timestamp: { type: Date, default: Date.now }
})

export default mongoose.model('Message', schema);