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

const Swipe = mongoose.model('Swipe', swipeSchema);

export default Swipe;
