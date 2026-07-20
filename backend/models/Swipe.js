import mongoose from 'mongoose';

const swipeSchema = mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // Room içindeki option'ın _id değeri olacak
    },
    decision: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── İndeksler ──────────────────────────────────────────────────────────────
// findOne({ room, user, optionId }) → tekrar swipe kontrolü için (en sık çalışan sorgu)
swipeSchema.index({ room: 1, user: 1, optionId: 1 }, { unique: true });

// countDocuments({ room, optionId, decision: 'like' }) → eşleşme kontrolü
swipeSchema.index({ room: 1, optionId: 1, decision: 1 });

// countDocuments({ room }) → toplam swipe sayısı kontrolü
swipeSchema.index({ room: 1 });

// countDocuments({ room, user }) → kullanıcının kaç swipe yaptığı
swipeSchema.index({ room: 1, user: 1 });

const Swipe = mongoose.model('Swipe', swipeSchema);

export default Swipe;
