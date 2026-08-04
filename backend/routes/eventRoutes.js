import express from 'express';
import Candidate from '../models/Candidate.js';
import { protect } from '../middleware/authMiddleware.js';
import { fetchAndStoreEvents } from '../services/eventFetcherService.js';

const router = express.Router();
let refreshPromise = null;

const refreshEventPool = async () => {
  if (!refreshPromise) {
    refreshPromise = fetchAndStoreEvents().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// GET /api/events/live?city=İstanbul
// Yaklaşan canlı etkinlikleri döndür (en fazla 40, sadece gelecekteki)
router.get('/live', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      isLiveEvent: true,
      eventDate: { $gte: now },
      expireAt: { $gt: now },
      // Eski demo üreticisinin kartları gerçek BuBilet havuzuyla karışmasın.
      externalId: { $not: /^fallback_/ },
    };

    // Opsiyonel şehir filtresi
    if (req.query.city && req.query.city !== 'Tümü') {
      query.city = req.query.city;
    }

    const getUpcomingEvents = () => Candidate.find(query)
      .sort({ isFeatured: -1, eventDate: 1 }) // öne çıkanlar önce, sonra tarihe göre
      .limit(40)
      .select('name description imageUrl location city eventDate eventSource budget mapsQuery ticketUrl isFeatured')
      .lean();

    let events = await getUpcomingEvents();

    // TTL temizliği veya servis kesintisi havuzu boşaltmışsa, ilk istek
    // kullanıcıyı boş widget ile bırakmaz: tek seferlik güvenli yenileme yapar.
    if (events.length === 0) {
      await refreshEventPool();
      events = await getUpcomingEvents();
    }

    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;
