import Room from '../models/Room.js';
import Swipe from '../models/Swipe.js';
import { mockOptions } from '../data/mockOptions.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';

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
        sourcePool = sourcePool.filter(item => {
          const b = item.budget ? item.budget.trim() : '';
          if (activePriceRange.includes('₺') && (b === '₺' || b.toLowerCase() === 'bedava')) return true;
          if (activePriceRange.includes('₺₺') && b === '₺₺') return true;
          if (activePriceRange.includes('₺₺₺') && (b === '₺₺₺' || b === '₺₺₺₺')) return true;
          return false;
        });
        if (sourcePool.length === 0) sourcePool = mockOptions[cleanCategory];
      }

      const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
      const count = Math.min(shuffled.length, Math.floor(Math.random() * 4) + 10);
      roomOptions = shuffled.slice(0, count);
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
      .populate('host', 'username')
      .populate('participants', 'username');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
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

        return res.json({
          ...updatedRoom,
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

    res.json({
      ...room.toObject(),
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
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id },
      { $addToSet: { participants: req.user._id } }, // addToSet: zaten varsa eklemez
      { new: true }
    ).populate('host', 'username').populate('participants', 'username');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// @desc    Odayı sil
// @route   DELETE /api/rooms/:id
// @access  Private
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).select('host _id');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.host.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Bu odayı silme yetkiniz yok');
    }

    // Paralel silme: oda ve swipe'ları aynı anda sil
    await Promise.all([
      Room.deleteOne({ _id: room._id }),
      Swipe.deleteMany({ room: room._id }),
    ]);

    res.json({ message: 'Oda başarıyla silindi' });
  } catch (error) {
    next(error);
  }
};

// @desc    Odayı başlat (Sadece host)
// @route   PUT /api/rooms/:id/start
// @access  Private
// Optimizasyon: findOneAndUpdate ile tek sorguda güncelle
export const startRoom = async (req, res, next) => {
  try {
    const room = await Room.findOneAndUpdate(
      {
        _id: req.params.id,
        host: req.user._id,   // host kontrolü sorguda yapılır
        status: 'waiting',    // zaten başlatılmışsa tekrar başlatma
      },
      {
        status: 'voting',
        votingStartedAt: new Date(),
      },
      { new: true }
    );

    if (!room) {
      // findOneAndUpdate null döndüyse: ya oda yok ya yetki yok ya da zaten başladı
      const exists = await Room.exists({ _id: req.params.id });
      if (!exists) {
        res.status(404);
        throw new Error('Oda bulunamadı');
      }
      res.status(401);
      throw new Error('Odayı sadece kurucu başlatabilir veya oda zaten başladı');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};
