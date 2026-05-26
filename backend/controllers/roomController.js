import Room from '../models/Room.js';
import User from '../models/User.js';
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

    // Eğer kategori seçildiyse ve manuel opsiyon girilmediyse mock verileri al
    if (cleanCategory && cleanCategory !== 'custom' && mockOptions[cleanCategory] && roomOptions.length === 0) {
      let sourcePool = mockOptions[cleanCategory];
      
      // Bütçe sınırlaması varsa ve kategori bütçe içeren bir kategoriyse filtrele
      if (activePriceRange.length > 0 && sourcePool.some(item => item.budget)) {
        sourcePool = sourcePool.filter(item => {
          const b = item.budget ? item.budget.trim() : '';
          
          let matches = false;
          if (activePriceRange.includes('₺') && (b === '₺' || b.toLowerCase() === 'bedava')) {
            matches = true;
          }
          if (activePriceRange.includes('₺₺') && b === '₺₺') {
            matches = true;
          }
          if (activePriceRange.includes('₺₺₺') && (b === '₺₺₺' || b === '₺₺₺₺')) {
            matches = true;
          }
          return matches;
        });

        // Eğer filtreleme sonucu hiç eleman kalmazsa, boş kalmaması için orijinal havuza geri dön
        if (sourcePool.length === 0) {
          sourcePool = mockOptions[cleanCategory];
        }
      }

      // Havuzdaki verileri karıştır (shuffling)
      const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
      // Rastgele 10-15 adet kartı al
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
      status: 'waiting' // Oda artık direkt başlamıyor, bekleme salonuna düşüyor
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcının kurduğu odaları getir
// @route   GET /api/rooms
// @access  Private
export const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ host: req.user._id }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// @desc    Oda detayını ve durumunu getir (Polling için)
// @route   GET /api/rooms/:id
// @access  Private
export const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'username email')
      .populate('participants', 'username email');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    // Oylama Durum Kontrolü: Kullanıcının mevcut kararlarını bul (SwipeDecisions)
    const userSwipes = await Swipe.find({ room: req.params.id, user: req.user._id });

    // Eğer oda oylama aşamasındaysa ve süre sınırı varsa, sürenin dolup dolmadığını kontrol et
    if (room.status === 'voting' && room.timeLimit > 0 && room.votingStartedAt) {
      const now = new Date();
      const elapsedSeconds = Math.floor((now - new Date(room.votingStartedAt)) / 1000);
      
      if (elapsedSeconds >= room.timeLimit) {
        // Süre dolmuş! Odayı bitir
        await finishRoomCalculation(room._id);
        
        // Odayı veritabanından güncel haliyle yeniden yükle
        const updatedRoom = await Room.findById(req.params.id)
          .populate('host', 'username email')
          .populate('participants', 'username email');
          
        const participantStatuses = await Promise.all(
          updatedRoom.participants.map(async (participant) => {
            return {
              user: participant,
              status: 'finished' // Süre bittiği için herkes finished kabul edilsin
            };
          })
        );

        return res.json({
          ...updatedRoom.toObject(),
          userSwipes: userSwipes.map(s => s.optionId.toString()),
          participantStatuses
        });
      }
    }

    // Katılımcıların canlı durumu
    const participantStatuses = await Promise.all(
      room.participants.map(async (participant) => {
        const swipedCount = await Swipe.countDocuments({ room: req.params.id, user: participant._id });
        return {
          user: participant,
          status: swipedCount === room.options.length && room.options.length > 0 ? 'finished' : 'voting'
        };
      })
    );

    res.json({
      ...room.toObject(),
      userSwipes: userSwipes.map(s => s.optionId.toString()),
      participantStatuses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Odaya katıl
// @route   PUT /api/rooms/:id/join
// @access  Private
export const joinRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    // Katılımcı zaten var mı kontrol et
    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
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
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    // Sadece host silebilir
    if (room.host.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Bu odayı silme yetkiniz yok');
    }

    await Room.deleteOne({ _id: room._id });
    await Swipe.deleteMany({ room: room._id });

    res.json({ message: 'Oda başarıyla silindi' });
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

    room.status = 'voting';
    room.votingStartedAt = Date.now();
    await room.save();

    res.json(room);
  } catch (error) {
    next(error);
  }
};
