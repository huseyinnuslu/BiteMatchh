import mongoose from 'mongoose';

const swipeDecisionSchema = mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    candidateId: {
      type: String,
      required: true,
    },
    isApproved: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const SwipeDecision = mongoose.model('SwipeDecision', swipeDecisionSchema);

export default SwipeDecision;
