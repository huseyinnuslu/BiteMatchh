import express from 'express';
import Candidate from '../models/Candidate.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/events/live
// Yaklaşan canlı etkinlikleri döndür (en fazla 20, sadece gelecekteki)
router.get('/live', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const events = await Candidate.find({
      isLiveEvent: true,
      eventDate: { $gte: now },
      expireAt:  { $gt:  now },
    })
      .sort({ eventDate: 1 }) // en yakın tarih önce
      .limit(20)
      .select('name description imageUrl location eventDate eventSource budget mapsQuery')
      .lean();

    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;
