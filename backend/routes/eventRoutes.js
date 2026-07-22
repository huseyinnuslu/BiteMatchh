import express from 'express';
import Candidate from '../models/Candidate.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/events/live?city=İstanbul
// Yaklaşan canlı etkinlikleri döndür (en fazla 40, sadece gelecekteki)
router.get('/live', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      isLiveEvent: true,
      eventDate:   { $gte: now },
      expireAt:    { $gt:  now },
    };

    // Opsiyonel şehir filtresi
    if (req.query.city && req.query.city !== 'Tümü') {
      query.city = req.query.city;
    }

    const events = await Candidate.find(query)
      .sort({ isFeatured: -1, eventDate: 1 }) // öne çıkanlar önce, sonra tarihe göre
      .limit(40)
      .select('name description imageUrl location city eventDate eventSource budget mapsQuery ticketUrl isFeatured')
      .lean();

    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;
