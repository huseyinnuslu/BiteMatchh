import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const candidateSchema = new mongoose.Schema({}, { strict: false });
const Candidate = mongoose.model('Candidate', candidateSchema);

async function checkEvents() {
  const events = await Candidate.find({ isLiveEvent: true }).lean();
  console.log("Total Live Events:", events.length);
  const now = new Date();
  
  const upcoming = await Candidate.find({
    isLiveEvent: true,
    eventDate: { $gte: now },
    expireAt: { $gt: now },
  }).lean();
  console.log("Upcoming Live Events:", upcoming.length);
  process.exit(0);
}

checkEvents();
