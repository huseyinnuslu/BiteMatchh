import Room from '../models/Room.js';
import Swipe from '../models/Swipe.js';
import { mockOptions, selectDiverseOptions } from '../data/mockOptions.js';
import { getEffectiveCatalog } from '../services/catalogService.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';
import { sendPushToUser } from '../utils/webPush.js';
import Notification from '../models/Notification.js';
import { getIo } from '../server.js';
import LocationShare from '../models/LocationShare.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { roundedDistanceKm } from '../utils/locationDistance.js';

const STREAMING_PLATFORMS = ['Netflix', 'Disney+', 'Prime Video', 'HBO Max', 'Apple TV+'];

const ACTIVE_ROOM_STATUSES = ['waiting', 'voting'];

const clearActiveRoom = (userIds, roomId) => User.updateMany(
  { _id: { $in: userIds }, activeRoom: roomId },
  { $set: { activeRoom: null } }
);

// Aynı hesabın iki cihazdan iki ayrı odaya girmesini UI'ye değil, atomik DB
// güncellemesine bağlayarak engeller. Eski/biten oda kilitleri otomatik temizlenir.
const claimActiveRoom = async (userId, roomId, { skipLegacyRecovery = false } = {}) => {
  const user = await User.findById(userId).select('activeRoom').lean();
  if (!user?.activeRoom && !skipLegacyRecovery) {
    // Bu alan eklenmeden önce oluşturulmuş aktif odaları da ilk istekte yakalar.
    const legacyActiveRoom = await Room.findOne({
      participants: userId,
      status: { $in: ACTIVE_ROOM_STATUSES },
      _id: { $ne: roomId },
    }).select('_id name').sort({ updatedAt: -1 }).lean();
    if (legacyActiveRoom) {
      await User.updateOne({ _id: userId, activeRoom: null }, { $set: { activeRoom: legacyActiveRoom._id } });
      const error = new Error(`Şu anda “${legacyActiveRoom.name}” odasındasın. Yeni bir odaya katılmadan önce odadan çıkmalısın.`);
      error.statusCode = 409;
      error.activeRoom = { id: legacyActiveRoom._id.toString(), name: legacyActiveRoom.name };
      throw error;
    }
  }
  if (user?.activeRoom && String(user.activeRoom) !== String(roomId)) {
    const lockedRoom = await Room.findById(user.activeRoom).select('status name participants').lean();
    // activeRoom, kullanıcı odadan ayrıldığında ya da başka bir hesap aynı
    // tarayıcı oturumuna geçtiğinde eski kayıttan kalmış olabilir. Sadece
    // kullanıcının hâlâ katılımcı olduğu gerçek aktif odalar kilit yaratır.
    const isStillParticipant = lockedRoom?.participants?.some(
      (participant) => String(participant) === String(userId)
    );
    if (lockedRoom && isStillParticipant && ACTIVE_ROOM_STATUSES.includes(lockedRoom.status)) {
      const error = new Error(`Şu anda “${lockedRoom.name}” odasındasın. Yeni bir odaya katılmadan önce odadan çıkmalısın.`);
      error.statusCode = 409;
      error.activeRoom = { id: lockedRoom._id.toString(), name: lockedRoom.name };
      throw error;
    }
    await User.updateOne({ _id: userId, activeRoom: user.activeRoom }, { $set: { activeRoom: null } });
  }

  const claimed = await User.findOneAndUpdate(
    { _id: userId, $or: [{ activeRoom: null }, { activeRoom: roomId }] },
    { $set: { activeRoom: roomId } },
    { new: true }
  ).select('_id');
  if (!claimed) {
    const error = new Error('Bu hesap başka bir aktif odada. Önce o odadan çıkmalısın.');
    error.statusCode = 409;
    throw error;
  }
};

// @desc    Kullanıcının gerçekten aktif olan odasını getirir
// @route   GET /api/rooms/active
// @access  Private
// Eski hesap/oda kayıtları burada da doğrulanır ve geçersizse temizlenir.
export const getActiveRoom = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('activeRoom').lean();
    let room = user?.activeRoom
      ? await Room.findById(user.activeRoom).select('_id name status host participants').lean()
      : null;

    const isParticipant = room?.participants?.some(
      (participant) => String(participant) === String(req.user._id)
    );

    // Eski activeRoom alanı olmayan hesaplar için de gerçek aktif oda bulunur.
    if (!room && !user?.activeRoom) {
      room = await Room.findOne({
        participants: req.user._id,
        status: { $in: ACTIVE_ROOM_STATUSES },
      }).select('_id name status host participants').sort({ updatedAt: -1 }).lean();
      if (room) {
        await User.updateOne({ _id: req.user._id, activeRoom: null }, { $set: { activeRoom: room._id } });
      }
    }

    const isValid = room && ACTIVE_ROOM_STATUSES.includes(room.status) && (
      isParticipant || room.participants?.some((participant) => String(participant) === String(req.user._id))
    );

    if (!isValid) {
      if (user?.activeRoom) {
        await User.updateOne({ _id: req.user._id, activeRoom: user.activeRoom }, { $set: { activeRoom: null } });
      }
      return res.json({ room: null });
    }

    res.json({ room: { _id: room._id.toString(), name: room.name, status: room.status } });
  } catch (error) {
    next(error);
  }
};

// @desc    Kullanıcının aktif oda kilidini güvenli biçimde kapatır
// @route   PUT /api/rooms/active/leave
// @access  Private
// Oda silinmiş, kullanıcı katılımcılardan çıkarılmış veya farklı hesap
// oturumundan kalmışsa yalnızca kilit temizlenir. Gerçek odadaysa normal
// "odadan ayrıl" kuralları uygulanır.
export const leaveActiveRoom = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('activeRoom').lean();
    if (!user?.activeRoom) return res.json({ message: 'Aktif oda kaydı yoktu.', roomClosed: false });

    const room = await Room.findById(user.activeRoom).select('host participants status name');
    const isParticipant = room?.participants?.some(
      (participant) => String(participant) === String(req.user._id)
    );

    if (!room || !isParticipant || !ACTIVE_ROOM_STATUSES.includes(room.status)) {
      await User.updateOne({ _id: req.user._id, activeRoom: user.activeRoom }, { $set: { activeRoom: null } });
      return res.json({ message: 'Eski aktif oda kaydı temizlendi.', roomClosed: false });
    }

    if (String(room.host) === String(req.user._id)) {
      room.status = 'expired';
      await room.save();
      await clearActiveRoom(room.participants, room._id);
      getIo()?.to(room._id.toString()).emit('room_expired', { roomId: room._id.toString() });
      return res.json({ message: 'Aktif odadan ayrıldın. Oda kapatıldı.', roomClosed: true });
    }

    room.participants = room.participants.filter(
      (participant) => String(participant) !== String(req.user._id)
    );
    if (room.participants.length < 2) {
      room.status = 'expired';
      await room.save();
      await clearActiveRoom(room.participants, room._id);
      getIo()?.to(room._id.toString()).emit('room_expired', { roomId: room._id.toString() });
    } else {
      await room.save();
      getIo()?.to(room._id.toString()).emit('participant_left', { roomId: room._id.toString(), userId: req.user._id.toString() });
    }
    await clearActiveRoom([req.user._id], room._id);
    res.json({ message: 'Aktif odadan ayrıldın.', roomClosed: room.status === 'expired' });
  } catch (error) {
    next(error);
  }
};

const isStreamingFilmRoom = (room) => ['film', 'movie'].includes(room.category) && room.watchMode === 'streaming';
const completedStreamingParticipantIds = (room) => new Set(
  (room.platformSelections || [])
    .map((selection) => String(selection.user?._id || selection.user))
    .filter((userId) => (room.participants || []).some((participant) => String(participant?._id || participant) === userId))
);
const sanitizeStreamingRoom = (room, userId) => {
  const plainRoom = room.toObject ? room.toObject() : room;
  if (!isStreamingFilmRoom(plainRoom)) return plainRoom;
  const mine = (plainRoom.platformSelections || []).find((selection) => String(selection.user?._id || selection.user) === String(userId));
  const safeRoom = { ...plainRoom };
  delete safeRoom.platformSelections;
  safeRoom.streamingSetup = {
    completedCount: completedStreamingParticipantIds(plainRoom).size,
    participantCount: (plainRoom.participants || []).length,
    myPlatforms: mine?.platforms || [],
  };
  return safeRoom;
};

const selectFilmOptionsForPlatforms = (catalog, platforms) => {
  const pool = catalog.film.filter((option) => platforms.includes(option.platform));
  return selectDiverseOptions(pool, Math.min(pool.length, Math.floor(Math.random() * 6) + 10));
};

// Oda oluşturulduktan sonra kartlar oda belgesine kopyalanır. Görsel havuzu
// düzeltildiğinde eski/açık odaların da yeni doğru görseli alabilmesi için,
// yalnızca API cevabındaki kart görselini güncel katalogla eşitliyoruz.
const hydrateRoomCardImages = async (room) => {
  const catalog = await getEffectiveCatalog();
  const currentCardImages = new Map([...catalog.mekan, ...catalog.film, ...catalog.aktivite].map((item) => [item.name, item.imageUrl]));
  const hydrateCurrentCardImage = (card) => {
    const imageUrl = currentCardImages.get(card?.name);
    return imageUrl ? { ...card, imageUrl } : card;
  };
  return {
    ...room,
    options: (room.options || []).map(hydrateCurrentCardImage),
    matchResult: room.matchResult ? hydrateCurrentCardImage(room.matchResult) : room.matchResult,
    topOptions: (room.topOptions || []).map(hydrateCurrentCardImage),
  };
};

const personalizeRestaurantDistances = async (room, userId) => {
  if (!['restaurant', 'cinema'].includes(room.category) || !room.parentRoom) return room;
  const locations = await LocationShare.find({
    room: room.parentRoom,
    user: { $in: room.participants || [] },
    expiresAt: { $gt: new Date() },
  }).lean();
  const location = locations.find((item) => item.user.toString() === userId.toString());
  if (!location) return room;

  return {
    ...room,
    options: (room.options || []).map((option) => ({
      ...option,
      distanceFromYouKm: Number.isFinite(option.latitude) && Number.isFinite(option.longitude)
        ? roundedDistanceKm(location, option)
        : null,
      // Bu değer öneriler hazırlanırken tüm katılımcıların aynı anlık
      // konumlarıyla tek kez hesaplanıp saklanır. İstek anında tekrar
      // hesaplamamak, iki cihazın farklı "grubun en uzağı" görmesini önler.
      maxGroupDistanceKm: Number.isFinite(option.maxGroupDistanceKm)
        ? option.maxGroupDistanceKm
        : null,
    })),
  };
};

// @desc    Oda oluştur
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res, next) => {
  try {
    const { name, category, options, priceRange, timeLimit, watchMode, streamingPlatforms, mealPeriod } = req.body;

    let roomOptions = options || [];
    const cleanCategory = category ? category.toLowerCase() : 'custom';
    const validMealPeriods = new Set(['all', 'breakfast', 'lunch', 'dinner', 'dessert-coffee', 'late-night']);
    const selectedMealPeriod = cleanCategory === 'mekan' && validMealPeriods.has(mealPeriod)
      ? mealPeriod
      : 'all';
    const activePriceRange = priceRange || [];
    // Canlı ve lisanslı seans verisi olmadan sinema akışı göstermiyoruz.
    // Film odaları yalnızca ortak streaming platformları üzerinden başlar.
    const normalizedWatchMode = cleanCategory === 'film' ? 'streaming' : null;
    const selectedPlatforms = [...new Set((Array.isArray(streamingPlatforms) ? streamingPlatforms : [])
      .filter((platform) => STREAMING_PLATFORMS.includes(platform)))];
    if (cleanCategory === 'film' && normalizedWatchMode === 'streaming' && selectedPlatforms.length === 0) {
      return res.status(400).json({ message: 'Evde izleme için en az bir platform seçmelisin.' });
    }

    const effectiveCatalog = await getEffectiveCatalog();
    if (cleanCategory && cleanCategory !== 'custom' && effectiveCatalog[cleanCategory] && roomOptions.length === 0) {
      let sourcePool = cleanCategory === 'film' && normalizedWatchMode === 'streaming'
        ? effectiveCatalog.film.filter((option) => selectedPlatforms.includes(option.platform))
        : effectiveCatalog[cleanCategory];

      // Bu filtre fiyat filtresi gibi "esnememeli". Kullanıcı örneğin
      // "Tatlı & Kahve" seçtiyse akşam yemeği kartı görmemeli.
      if (cleanCategory === 'mekan' && selectedMealPeriod !== 'all') {
        sourcePool = sourcePool.filter((option) => option.mealPeriods?.includes(selectedMealPeriod));
      }

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

    const roomId = new mongoose.Types.ObjectId();
    let room;
    try {
      room = await Room.create({
      _id: roomId,
      name,
      host: req.user._id,
      participants: [req.user._id],
      options: roomOptions,
      category: cleanCategory,
      watchMode: normalizedWatchMode,
      // Bu liste kullanıcının sahip oldukları değil, bu beta akışında
      // seçilebilecek platform kataloğudur. Her katılımcının gerçek erişimi
      // platformSelections içinde oda bazında ayrı tutulur.
      streamingPlatforms: cleanCategory === 'film' && normalizedWatchMode === 'streaming' ? STREAMING_PLATFORMS : [],
      platformSelections: cleanCategory === 'film' && normalizedWatchMode === 'streaming'
        ? [{ user: req.user._id, platforms: selectedPlatforms, submittedAt: new Date() }]
        : [],
      priceRange: activePriceRange,
      mealPeriod: selectedMealPeriod,
      timeLimit: Number(timeLimit) || 0,
      status: 'waiting',
      });

      // Oda belgesini kilitten önce oluşturuyoruz. Önce kilit alınıp oda
      // birkaç ms sonra yazıldığında ikinci cihaz bu kaydı "eski" sanıp
      // temizleyebiliyor ve aynı hesap iki oda açabiliyordu. Belge artık
      // görünür durumdayken atomik activeRoom kilidi alınır.
      await claimActiveRoom(req.user._id, roomId, { skipLegacyRecovery: true });
    } catch (error) {
      await clearActiveRoom([req.user._id], roomId);
      await Room.deleteOne({ _id: roomId, host: req.user._id, status: 'waiting' });
      throw error;
    }

    res.status(201).json(sanitizeStreamingRoom(room, req.user._id));
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
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

        const personalizedRoom = await personalizeRestaurantDistances(await hydrateRoomCardImages(updatedRoom), req.user._id);
        return res.json({
          ...sanitizeStreamingRoom(personalizedRoom, req.user._id),
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

    const personalizedRoom = await personalizeRestaurantDistances(await hydrateRoomCardImages(room.toObject()), req.user._id);
    res.json({
      ...sanitizeStreamingRoom(personalizedRoom, req.user._id),
      userSwipes: userSwipes.map(s => s.optionId.toString()),
      participantStatuses,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Aktif odadan ayrıl
// @route   PUT /api/rooms/:id/leave
// @access  Private
export const leaveRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).select('host participants status name');
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı.' });
    if (!room.participants.some((participant) => String(participant) === String(req.user._id))) {
      return res.status(403).json({ message: 'Bu odada değilsin.' });
    }

    if (String(room.host) === String(req.user._id)) {
      // Kurucu ayrılırsa yarım kalmış grup oylaması güvenle kapanır; kimse
      // sahipsiz bir bekleme/voting odasında kalmaz.
      room.status = 'expired';
      await room.save();
      await clearActiveRoom(room.participants, room._id);
      getIo()?.to(room._id.toString()).emit('room_expired', { roomId: room._id.toString() });
      return res.json({ message: 'Odadan ayrıldın. Oda kapatıldı.', roomClosed: true });
    }

    const departingUser = await User.findById(req.user._id).select('username').lean();
    room.participants = room.participants.filter((participant) => String(participant) !== String(req.user._id));
    if (room.participants.length < 2 && ACTIVE_ROOM_STATUSES.includes(room.status)) {
      room.status = 'expired';
      await room.save();
      await clearActiveRoom(room.participants, room._id);
      getIo()?.to(room._id.toString()).emit('room_expired', { roomId: room._id.toString() });
    } else {
      await room.save();
      getIo()?.to(room._id.toString()).emit('participant_left', {
        roomId: room._id.toString(),
        userId: req.user._id.toString(),
        username: departingUser?.username || 'Bir katılımcı',
      });
    }
    await clearActiveRoom([req.user._id], room._id);
    res.json({ message: 'Odadan ayrıldın.', roomClosed: room.status === 'expired' });
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

    const isAlreadyParticipant = room.participants.some((participant) => String(participant) === String(req.user._id));
    if (!isAlreadyParticipant) await claimActiveRoom(req.user._id, room._id);

    let updatedRoom;
    try {
      updatedRoom = await Room.findOneAndUpdate(
      { _id: req.params.id },
      { $addToSet: { participants: req.user._id } }, // addToSet: zaten varsa eklemez
      { new: true }
      ).populate('host', 'username').populate('participants', 'username');
    } catch (error) {
      if (!isAlreadyParticipant) await clearActiveRoom([req.user._id], room._id);
      throw error;
    }

    res.json(sanitizeStreamingRoom(updatedRoom, req.user._id));
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
        clearActiveRoom(room.participants, room._id),
      ]);
      res.json({ message: 'Oda başarıyla silindi' });
    } else if (room.participants.some(p => p.toString() === req.user._id.toString())) {
      // Katılımcı ise kendini katılımcılar listesinden çıkar (geçmişten silmek için)
      room.participants = room.participants.filter(p => p.toString() !== req.user._id.toString());
      await room.save();
      await clearActiveRoom([req.user._id], room._id);
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

    if (isStreamingFilmRoom(room)) {
      const selections = room.platformSelections || [];
      const completedParticipantIds = completedStreamingParticipantIds(room);
      if (completedParticipantIds.size < room.participants.length) {
        return res.status(400).json({ message: 'Film kartlarını hazırlamak için herkes erişebildiği platformları seçmeli.' });
      }
      const commonPlatforms = STREAMING_PLATFORMS.filter((platform) =>
        room.participants.every((participant) => selections
          .filter((selection) => String(selection.user) === String(participant))
          .some((selection) => selection.platforms.includes(platform)))
      );
      const effectiveCatalog = await getEffectiveCatalog();
      const filmOptions = selectFilmOptionsForPlatforms(effectiveCatalog, commonPlatforms);
      if (filmOptions.length < 2) {
        return res.status(400).json({ message: 'Grubun ortak platformlarında yeterli film veya dizi bulunamadı. Platform seçimlerini güncelleyin.' });
      }
      room.options = filmOptions;
    }
    room.status = 'voting';
    room.votingStartedAt = new Date();
    await room.save();

    const io = getIo();
    if (io) {
      // Platform tercihleri özel veridir; socket odasına ham listeyi yaymayız.
      io.to(room._id.toString()).emit('room_started', sanitizeStreamingRoom(room, null));
    }

    res.json(sanitizeStreamingRoom(room, req.user._id));
  } catch (error) {
    next(error);
  }
};

// @desc    Streaming film odasında kendi erişilebilir platformlarını kaydet
// @route   PUT /api/rooms/:id/streaming-platforms
// @access  Private
export const updateStreamingPlatforms = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Oda bulunamadı.' });
    if (!room.participants.some((participant) => String(participant) === String(req.user._id))) {
      return res.status(403).json({ message: 'Bu odada platform tercihi kaydedemezsin.' });
    }
    if (!isStreamingFilmRoom(room) || room.status !== 'waiting') {
      return res.status(400).json({ message: 'Bu odada platform tercihi değiştirilemez.' });
    }
    const platforms = [...new Set((Array.isArray(req.body?.platforms) ? req.body.platforms : [])
      .filter((platform) => STREAMING_PLATFORMS.includes(platform)))];
    if (!platforms.length) return res.status(400).json({ message: 'En az bir erişebildiğin platformu seçmelisin.' });
    room.platformSelections = (room.platformSelections || []).filter((selection) => String(selection.user) !== String(req.user._id));
    room.platformSelections.push({ user: req.user._id, platforms, submittedAt: new Date() });
    // Eski sürümle oluşturulan odalarda yalnız kurucunun ilk seçimi bu alana
    // yazılmış olabilir. Bu alanı katalogla eşitleyerek o odalarda da yeni
    // platform eklemeyi mümkün kılıyoruz.
    room.streamingPlatforms = STREAMING_PLATFORMS;
    await room.save();
    getIo()?.to(room._id.toString()).emit('streaming_platforms_updated', { roomId: room._id.toString() });
    res.json(sanitizeStreamingRoom(room, req.user._id));
  } catch (error) { next(error); }
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
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: 'Geçerli bir arkadaş seçmelisin.' });
    }

    const room = await Room.findById(req.params.id).select('host status participants invitedUsers');

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.host.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Sadece oda sahibi davet gönderebilir');
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ message: 'Bu odaya artık davet gönderilemez.' });
    }

    // Bu güncelleme atomiktir: kullanıcı iki kez tıklasa veya iki HTTP
    // isteği aynı anda ulaşsa bile yalnızca ilk istek invitedUsers dizisine
    // eklenir ve aşağıdaki bildirim gönderme adımına geçer.
    const claimedRoom = await Room.findOneAndUpdate(
      { _id: room._id, host: req.user._id, invitedUsers: { $ne: friendId } },
      {
        $addToSet: { invitedUsers: friendId },
        $set: { inviteExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      },
      { new: true }
    );

    if (!claimedRoom) {
      return res.json({ ...room.toObject(), alreadyInvited: true });
    }

    // Push notification gönder (fire-and-forget)
    sendPushToUser(friendId, {
      title: 'BiteMatch Oda Daveti',
      body: `${req.user.username} sizi odaya davet etti! Katılmak için 15 dakikanız var.`,
      url: `/room/${claimedRoom._id}`,
    }).catch(() => {});

    // Socket.io ile anlık bildirim fırlat
    try {
      const message = `${req.user.username} sizi bir odaya davet etti!`;
      const notif = await Notification.create({
        user: friendId, message,
        type: 'room_invite',
        link: `/room/${claimedRoom._id}`
      });
      const io = getIo();
      if (io) {
        io.to(`user:${friendId}`).emit('new_notification', notif);
        io.to(`user:${friendId}`).emit('room_invitation', { 
          roomCode: claimedRoom.name, 
          roomId: claimedRoom._id, 
          inviterName: req.user.username, 
          message 
        });
      }
    } catch (e) {
      console.error('Bildirim gönderilemedi:', e.message);
    }

    res.json(claimedRoom);
  } catch (error) {
    next(error);
  }
};
