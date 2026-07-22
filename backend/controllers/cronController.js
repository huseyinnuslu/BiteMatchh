import Candidate from '../models/Candidate.js';

// @desc    Geçmiş etkinlikleri temizle
// @route   POST /api/cron/cleanup-events
// @access  Private (CRON_SECRET_KEY ile)
export const cleanupEvents = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.CRON_SECRET_KEY) {
      return res.status(500).json({ message: 'Server Configuration Error: CRON_SECRET_KEY not set' });
    }
    
    if (token !== process.env.CRON_SECRET_KEY) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Günün başlangıcını ayarla
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Etkinlik tarihi bugünün başlangıcından küçük olan (veya expireAt'i dolmuş) etkinlikleri sil
    const result = await Candidate.deleteMany({
      isLiveEvent: true,
      eventDate: { $lt: today },
    });

    res.json({
      success: true,
      message: `${result.deletedCount} adet geçmiş etkinlik başarıyla silindi.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
