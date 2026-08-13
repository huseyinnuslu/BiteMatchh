import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import { sendPushToUser } from '../utils/webPush.js';
import { getNotifications, markAllAsRead, markAsRead, deleteNotification, openNotification } from '../controllers/notificationController.js';

const router = express.Router();

// ---- Uygulama İçi Bildirimler (In-App) ----
router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);
router.post('/:id/open', protect, openNotification);

// ---- Web Push Bildirimleri ----
router.post('/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) { res.status(400); throw new Error('Gecersiz subscription'); }
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    res.json({ message: 'Push bildirimleri aktif edildi' });
  } catch (e) { next(e); }
});

router.delete('/unsubscribe', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: null });
    res.json({ message: 'Push bildirimleri iptal edildi' });
  } catch (e) { next(e); }
});

router.post('/test', protect, async (req, res, next) => {
  try {
    await sendPushToUser(req.user._id, { title: 'BiteMatch', body: 'Test bildirimi basarili!' });
    res.json({ message: 'Test bildirimi gonderildi' });
  } catch (e) { next(e); }
});

export default router;
