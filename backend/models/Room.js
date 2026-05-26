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
      enum: ['waiting', 'voting', 'finished'],
      default: 'waiting',
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

const Room = mongoose.model('Room', roomSchema);

export default Room;
