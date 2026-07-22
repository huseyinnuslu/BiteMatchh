import mongoose from 'mongoose';

const roomSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    options: [{ 
      name: String, 
      imageUrl: String,
      rating: Number,
      budget: String,
      description: String,
      imdbScore: Number,
      platform: String,
      duration: String,
      location: String
    }],
    category: {
      type: String,
      default: 'custom'
    },
    priceRange: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['waiting', 'voting', 'finished', 'expired'],
      default: 'waiting',
    },
    inviteExpiresAt: {
      type: Date,
      default: null,
    },
    matchResult: {
      name: String,
      imageUrl: String,
      rating: Number,
      budget: String,
      description: String
    },
    compatibilityPercentage: {
      type: Number,
      default: 0
    },
    topOptions: [{
      name: String,
      imageUrl: String,
      rating: Number,
      budget: String,
      description: String,
      likeCount: Number
    }],
    timeLimit: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    votingStartedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
  }
);

// ─── İndeksler ──────────────────────────────────────────────────────────────
// getMyRooms: { host, createdAt } → host'a göre filtrele + createdAt'e göre sırala
roomSchema.index({ host: 1, createdAt: -1 });

// Admin / dashboard: status'e göre filtrele (waiting, voting, finished)
roomSchema.index({ status: 1 });

// participants dizisinde belirli bir user'ı ara (joinRoom kontrolü)
roomSchema.index({ participants: 1 });

// Zombi Oda Temizliği: 30 dakika (1800 saniye) boyunca işlem görmeyen (updatedAt) waiting veya voting statüsündeki odaları otomatik sil
roomSchema.index(
  { updatedAt: 1 }, 
  { 
    expireAfterSeconds: 1800, 
    partialFilterExpression: { status: { $in: ['waiting', 'voting'] } } 
  }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;
