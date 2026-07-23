import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

const candidateSchema = new mongoose.Schema({}, { strict: false });
const Candidate = mongoose.model('Candidate', candidateSchema);

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  await Candidate.deleteMany({ isLiveEvent: true });
  console.log("Cleared live events");
  process.exit(0);
}
clean();
