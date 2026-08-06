import mongoose from 'mongoose';

// Restoran/sinema önerisi için verilen konumlar kalıcı kullanıcı verisi değildir.
// Öneri tamamlanmasa bile kısa süre sonra MongoDB TTL ile otomatik temizlenir.
const locationShareSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

locationShareSchema.index({ room: 1, user: 1 }, { unique: true });
locationShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('LocationShare', locationShareSchema);
