/**
 * eventRoutes.js
 * GET /api/events → Yaklaşan canlı etkinlikleri döner
 */
import express from 'express';
import Candidate from '../models/Candidate.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc  Yaklaşan canlı etkinlikleri getir (kart havuzundan bağımsız)
// @route GET /api/events
// @access Private
router.get('/', protect, async (req, res, next) => {
  try {
    const now    = new Date();
    const limit  = parseInt(req.query.limit) || 10;
    const cat    = req.query.category;       // opsiyonel kategori filtresi

    const filter = {
      isLiveEvent: true,
      eventDate: { $gt: now },
      expireAt:  { $gt: now },
    };
    if (cat) filter.category = cat;

    const events = await Candidate.find(filter)
      .sort({ eventDate: 1 })               // en yakın önce
      .limit(limit)
      .select('name imageUrl category description location budget eventDate eventSource duration')
      .lean();

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
