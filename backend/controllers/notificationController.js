import Notification from '../models/Notification.js';
import Room from '../models/Room.js';

// @desc    Kullanıcının bildirimlerini getir
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Son 50 bildirimi getir
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Tüm bildirimleri okundu olarak işaretle
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Tek bir bildirimi okundu olarak işaretle
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      res.status(404);
      throw new Error('Bildirim bulunamadı.');
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

// @desc    Bildirimin hedefini güvenli şekilde aç
// @route   POST /api/notifications/:id/open
// @access  Private
export const openNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Bildirim bulunamadı.' });

    let link = notification.link || '/dashboard';
    let inactive = false;
    if (notification.type === 'room_invite') {
      const roomId = String(link).match(/^\/room\/([a-f\d]{24})$/i)?.[1];
      const room = roomId ? await Room.findById(roomId).select('status inviteExpiresAt') : null;
      // Davet yalnızca bekleme salonu açıkken anlamlıdır. Bitmiş, silinmiş,
      // oylamaya geçmiş ya da süresi dolmuş odada eski davet sonucu açılmaz.
      const invitationIsActive = room?.status === 'waiting' &&
        room.inviteExpiresAt && new Date(room.inviteExpiresAt) > new Date();
      if (!invitationIsActive) {
        link = '/dashboard';
        inactive = true;
      }
    }
    res.json({ link, inactive });
  } catch (error) { next(error); }
};
