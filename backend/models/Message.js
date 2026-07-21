import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    text:       { type: String, required: true, maxlength: 500 },
    expireAt:   { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
