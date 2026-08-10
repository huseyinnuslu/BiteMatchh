import mongoose from 'mongoose';

const supportRequestSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true });

supportRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('SupportRequest', supportRequestSchema);
