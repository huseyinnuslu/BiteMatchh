import Room from '../models/Room.js';
import Swipe from '../models/Swipe.js';
import { mockOptions, selectDiverseOptions } from '../data/mockOptions.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';
import { sendPushToUser } from '../utils/webPush.js';
import Notification from '../models/Notification.js';
import { getIo } from '../server.js';
import LocationShare from '../models/LocationShare.js';

const EARTH_RADIUS_KM = 6371;

const haversineKm = (from, to) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Oda oluşturulduktan sonra kartlar oda belgesine kopyalanır. Görsel havuzu
// düzeltildiğinde eski/açık odaların da yeni doğru görseli alabilmesi için,
// yalnızca API cevabındaki kart görselini güncel katalogla eşitliyoruz.
const currentCardImages = new Map(
  [...mockOptions.mekan, ...mockOptions.film, ...mockOptions.aktivite]
    .map((item) => [item.name, item.imageUrl])
);

const hydrateCurrentCardImage = (card) => {
  const imageUrl = currentCardImages.get(card?.name);
  return imageUrl ? { ...card, imageUrl } : card;
};

const hydrateRoomCardImages = (room) => ({
  ...room,
  options: (room.options || []).map(hydrateCurrentCardImage),
  matchResult: room.matchResult ? hydrateCurrentCardImage(room.matchResult) : room.matchResult,
  topOptions: (room.topOptions || []).map(hydrateCurrentCardImage),
});

const personalizeRestaurantDistances = async (room, userId) => {
  if (!['restaurant', 'cinema'].includes(room.category) || !room.parentRoom) return room;
  const location = await LocationShare.findOne({
    room: room.parentRoom,
    user: userId,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!location) return room;

  return {
    ...room,
    options: (room.options || []).map((option) => ({
      ...option,
      distanceFromYouKm: Number.isFinite(option.latitude) && Number.isFinite(option.longitude)
        ? Number(haversineKm(location, option).toFixed(1))
        : null,
    })),
  };
};

// @desc    Oda oluştur
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res, next) => {
  try {
    const { name, category, options, priceRange, timeLimit } = req.body;

    let roomOptions = options || [];
    const cleanCategory = category ? category.toLowerCase() : 'custom';
    const activePriceRange = priceRange || [];

    if (cleanCategory && cleanCategory !== 'custom' && mockOptions[cleanCategory] && roomOptions.length === 0) {
      let sourcePool = mockOptions[cleanCategory];

      if (activePriceRange.length > 0 && sourcePool.some(item => item.budget)) {
        const filteredPool = sourcePool.filter(item => {
          const b = item.budget ? item.budget.trim() : '';
          if (activePriceRange.includes('₺') && (b === '₺' || b.toLowerCase() === 'bedava')) return true;
          if (activePriceRange.includes('₺₺') && b === '₺₺') return true;
          if (activePriceRange.includes('₺₺₺') && (b === '₺₺₺' || b === '₺₺₺₺')) return true;
          return false;
        });
        // Eğer filtre sonucu çok az seçenek kalıyorsa, esneklik sağla (filtreyi yoksay)
        if (filteredPool.length >= 4) {
          sourcePool = filteredPool;
        }
      }

      // Sınırsız süre de olsa, garantili olarak 10-15 arası kart getir.
      // Seçim rastgele kalır; ancak aynı mutfak/aktivite konseptinin tekrarlanması engellenir.
      const count = Math.min(sourcePool.length, Math.floor(Math.random() * 6) + 10);
      roomOptions = selectDiverseOptions(sourcePool, count);
    }

    const room = await Room.create({
      name,
      host: req.user._id,
      participants: [req.user._id],
      options: roomOptions,
      category: cleanCategory,
      priceRange: activePriceRange,
      timeLimit: Number(timeLimit) || 0,
      status: 'waiting',
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};



// @desc    Kullanıcının kurduğu odaları getir
// @route   GET /api/rooms
// @access  Private
// Optimizasyon: sadece liste için gereken alanlar .select() ile çekilir
export const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ host: req.user._id })
      .select('name status category createdAt participants timeLimit matchResult')
      .sort({ createdAt: -1 })
      .lean();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// @desc    Oda detayını ve durumunu getir (Polling / Socket fallback için)
// @route   GET /api/rooms/:id
// @access  Private
// Optimizasyon:
//   - populate sadece zorunlu alanlar (username)
//   - N ayrı countDocuments yerine tek aggregate ile katılımcı durumu
export const getRoomById = async (req, res, next) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findById(roomId)
      .populate('host', 'username profilePic')
      .populate('participants', 'username profilePic');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    // ── Davet süre kontrolü ────────────────────────────────────────────────
    if (room.status === 'waiting' && room.inviteExpiresAt) {
      if (new Date() > new Date(room.inviteExpiresAt) && room.participants.length <= 1) {
        room.status = 'expired';
        await room.save();
      }
    }

    // Kullanıcının kendi swipe'larını çek (sadece optionId alanı yeterli)
    const userSwipes = await Swipe.find({ room: roomId, user: req.user._id })
      .select('optionId')
      .lean();

    // ── Süre kontrolü ─────────────────────────────────────────────────────
    if (room.status === 'voting' && room.timeLimit > 0 && room.votingStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(room.votingStartedAt)) / 1000);

      if (elapsed >= room.timeLimit) {
        await finishRoomCalculation(room._id);

        const updatedRoom = await Room.findById(roomId)
          .populate('host', 'username')
          .populate('participants', 'username')
          .lean();

        // Süre bitince herkes "finished" kabul edilir — ek DB sorgusu gerekmez
        const participantStatuses = updatedRoom.participants.map(p => ({
          user: p,
          status: 'finished',
        }));

        const personalizedRoom = await personalizeRestaurantDistances(hydrateRoomCardImages(updatedRoom), req.user._id);
        return res.json({
          ...personalizedRoom,
          userSwipes: userSwipes.map(s => s.optionId.toString()),
          participantStatuses,
        });
      }
    }

    // ── Katılımcı durumu: N ayrı countDocuments yerine tek aggregate ─────
    // Her katılımcının kaç swipe yaptığını TEK sorguda hesapla
    const swipeCounts = await Swipe.aggregate([
      { $match: { room: room._id } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);

    // userId → count map'i kur (O(1) lookup)
    const swipeCountMap = new Map(
      swipeCounts.map(s => [s._id.toString(), s.count])
    );

    const participantStatuses = room.participants.map(p => ({
      user: p,
      status:
        room.options.length > 0 &&
        (swipeCountMap.get(p._id.toString()) || 0) >= room.options.length
          ? 'finished'
          : 'voting',
    }));

    const personalizedRoom = await personalizeRestaurantDistances(hydrateRoomCardImages(room.toObject()), req.user._id);
    res.json({
      ...personalizedRoom,
      userSwipes: userSwipes.map(s => s.optionId.toString()),
      participantStatuses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Odaya katıl
// @route   PUT /api/rooms/:id/join
// @access  Private
// Optimizasyon: findOneAndUpdate ile tek sorguda güncelle (find + save = 2 sorgu yerine 1)
export const joinRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    // Davet süre kontrolü
    if (room.status === 'expired' || (room.inviteExpiresAt && new Date() > new Date(room.inviteExpiresAt) && room.participants.length <= 1)) {
      if (room.status !== 'expired') {
        room.status = 'expired';
        await room.save();
      }
      res.status(400);
      throw new Error('Davet süresi doldu, odaya katılamazsınız.');
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { _id: req.params.id },
      { $addToSet: { participants: req.user._id } }, // addToSet: zaten varsa eklemez
      { new: true }
    ).populate('host', 'username').populate('participants', 'username');

    res.json(updatedRoom);
  } catch (error) {
    next(error);
  }
};

// @desc    Odayı sil
// @route   DELETE /api/rooms/:id
// @access  Private
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.host.toString() === req.user._id.toString()) {
      // Paralel silme: oda ve swipe'ları aynı anda sil
      await Promise.all([
        Room.deleteOne({ _id: room._id }),
        Swipe.deleteMany({ room: room._id }),
      ]);
      res.json({ message: 'Oda başarıyla silindi' });
    } else if (room.participants.some(p => p.toString() === req.user._id.toString())) {
      // Katılımcı ise kendini katılımcılar listesinden çıkar (geçmişten silmek için)
      room.participants = room.participants.filter(p => p.toString() !== req.user._id.toString());
      await room.save();
      res.json({ message: 'Oda geçmişinizden kaldırıldı' });
    } else {
      res.status(401);
      throw new Error('Bu odayla bir ilişkiniz bulunmuyor');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Odayı başlat (Sadece host)
// @route   PUT /api/rooms/:id/start
// @access  Private
export const startRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }
    
    if (room.host.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Odayı sadece kurucu başlatabilir');
    }

    if (room.status !== 'waiting') {
      res.status(400);
      throw new Error('Oda zaten başlatıldı veya tamamlandı');
    }

    if (room.participants.length < 2) {
      res.status(400);
      throw new Error('Odayı başlatmak için en az 1 kişi daha davet etmelisiniz (Toplam en az 2 kişi).');
    }

    room.status = 'voting';
    room.votingStartedAt = new Date();
    await room.save();

    const io = getIo();
    if (io) {
      io.to(room._id.toString()).emit('room_started', room);
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcının geçmiş başarılı eşleşmelerini getir
// @route   GET /api/rooms/history
// @access  Private
export const getMatchHistory = async (req, res, next) => {
  try {
    const matches = await Room.find({
      participants: req.user._id,
      status: { $in: ['finished', 'completed'] },
      $or: [
        { 'matchResult.name': { $exists: true, $ne: null } },
        { 'topOptions.0': { $exists: true } }
      ]
    })
      .populate('participants', 'username name')
      .sort({ updatedAt: -1 })
      .lean();

    res.json(matches);
  } catch (error) {
    next(error);
  }
};

// @desc    Arkadaşı odaya davet et (15 dk süreli)
// @route   PUT /api/rooms/:id/invite
// @access  Private
export const inviteToRoom = async (req, res, next) => {
  try {
    const { friendId } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.host.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Sadece oda sahibi davet gönderebilir');
    }

    // 15 dakika süre belirle
    room.inviteExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await room.save();

    // Push notification gönder (fire-and-forget)
    sendPushToUser(friendId, {
      title: 'BiteMatch Oda Daveti',
      body: `${req.user.username} sizi odaya davet etti! Katılmak için 15 dakikanız var.`,
      url: `/room/${room._id}`,
    }).catch(() => {});

    // Socket.io ile anlık bildirim fırlat
    try {
      const message = `${req.user.username} sizi bir odaya davet etti!`;
      const notif = await Notification.create({
        user: friendId, message,
        type: 'room_invite',
        link: `/room/${room._id}`
      });
      const io = getIo();
      if (io) {
        io.to(`user:${friendId}`).emit('new_notification', notif);
        io.to(`user:${friendId}`).emit('room_invitation', { 
          roomCode: room.name, 
          roomId: room._id, 
          inviterName: req.user.username, 
          message 
        });
      }
    } catch (e) {
      console.error('Bildirim gönderilemedi:', e.message);
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};
