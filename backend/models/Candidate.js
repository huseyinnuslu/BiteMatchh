import mongoose from 'mongoose';

const candidateSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    priceLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 2,
    },
    rating: Number,
    budget: String,
    description: String,
    imdbScore: Number,
    platform: String,
    duration: String,
    location: String
  },
  {
    timestamps: true,
  }
);

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;
