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

    // İlk test sürümlerinden kalan ve BiteMatch akışında yeri olmayan
    // deneme metinleri ("evlilik teklifi", "krallık" vb.) gerçek arkadaşlık
    // isteği/bildirimleriyle karışmamalı. Bunları sadece saklamak yerine
    // kullanıcının kendi bildirim geçmişinden kalıcı olarak temizliyoruz.
    const legacyTestNotification = /(evlilik teklif|krallığını|sizi bir araya getirdi)/i;
    const legacyIds = notifications
      .filter((notification) => legacyTestNotification.test(notification.message || ''))
      .map((notification) => notification._id);

    if (legacyIds.length) {
      await Notification.deleteMany({ user: req.user._id, _id: { $in: legacyIds } });
    }

    res.json(notifications.filter((notification) => !legacyTestNotification.test(notification.message || '')));
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

// @desc    Tek bir bildirimi sil
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    // Bildirim mutlaka oturumdaki kullanıcıya ait olmalı; başka bir kullanıcının
    // bildirimi tahmin edilen bir id ile silinemez.
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Bildirim bulunamadı.' });
    }

    res.json({ message: 'Bildirim silindi.', id: notification._id });
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

    // Eski sürümlerde bazı oda davetleri `system` veya `message` türünde de
    // kaydedilmiş olabilir. Bu nedenle yalnızca bildirimin türüne değil, hedef
    // bağlantının kendisine bakarız. Bitmiş/silinmiş oda asla eski eşleşme
    // ekranına açılmaz.
    const roomId = String(link).match(/^\/room\/([a-f\d]{24})(?:\?.*)?$/i)?.[1];
    if (roomId) {
      const room = await Room.findById(roomId).select('status inviteExpiresAt participants');
      const isParticipant = room?.participants?.some((participantId) => String(participantId) === String(req.user._id));
      const isLiveRoom = notification.type === 'room_invite'
        ? room?.status === 'waiting'
        : Boolean(room && isParticipant && ['waiting', 'voting'].includes(room.status));
      const invitationIsActive = notification.type !== 'room_invite' || (
        room?.status === 'waiting' &&
        room.inviteExpiresAt && new Date(room.inviteExpiresAt) > new Date()
      );

      if (!isLiveRoom || !invitationIsActive) {
        link = '/dashboard';
        inactive = true;
      } else if (notification.type === 'room_invite') {
        // Davetli kullanıcının zaten başka bir canlı odası varsa, onu önce
        // davet odasına yönlendirip join isteğinin 409 ile düşmesine izin
        // vermeyiz. Bu hem açık odanın kaybolmuş gibi görünmesini hem de
        // Keşfet -> davet odası arasında tutarsız gezinmeyi engeller.
        const activeRoom = await Room.findOne({
          participants: req.user._id,
          status: { $in: ['waiting', 'voting'] },
          _id: { $ne: room._id },
        }).select('_id name').sort({ updatedAt: -1 }).lean();

        if (activeRoom) {
          link = `/room/${activeRoom._id}`;
          return res.json({
            link,
            inactive: false,
            blockedByActiveRoom: {
              id: activeRoom._id.toString(),
              name: activeRoom.name,
            },
          });
        }
      }
    }
    res.json({ link, inactive });
  } catch (error) { next(error); }
};
