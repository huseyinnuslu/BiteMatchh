import Swipe from '../models/Swipe.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';
import { getIo } from '../server.js';

// @desc    Kaydırma (Like/Dislike) kaydet ve sonucu kontrol et
// @route   POST /api/swipes
// @access  Private
// Optimizasyon:
//   - findOne + save (2 sorgu) → findOneAndUpdate upsert (1 sorgu)
//   - Room sadece gerekli alanlarla çekilir
export const recordSwipe = async (req, res, next) => {
  try {
    const { roomId, optionId, decision } = req.body;

    // Sadece gerekli alanları çek
    const room = await Room.findById(roomId).select(
      'participants options status matchResult category'
    );

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.status !== 'voting') {
      return res.status(400).json({ message: 'Oylama zaten tamamlandı' });
    }

    // findOneAndUpdate + upsert: tek sorguda "varsa güncelle, yoksa oluştur"
    // isNew: daha önce swipe yapılmamışsa true — istatistik sadece yeni swipe'ta güncellenir
    if (!room.participants.some((participant) => participant.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Bu odada oy kullanma yetkiniz yok' });
    }

    if (!room.options.id(optionId)) {
      return res.status(400).json({ message: 'Geçersiz seçenek' });
    }

    const swipeResult = await Swipe.findOneAndUpdate(
      { room: roomId, user: req.user._id, optionId },
      { decision },
      { upsert: true, new: true, rawResult: true }
    );

    const isNewSwipe = swipeResult.lastErrorObject?.upserted != null;

    // ── Kullanıcı istatistiklerini güncelle (sadece yeni swipe'ta) ─────────
    if (isNewSwipe) {
      const category = room.category || 'custom';
      const updateOp = {
        $inc: { 'stats.totalSwipes': 1 },
      };

      // Sağa kaydırma (like) → kategori dağılımını güncelle
      if (decision === 'like') {
        updateOp.$inc[`stats.categoryDistribution.${category}`] = 1;
      }

      // Fire-and-forget: istatistik güncellemesi sonucu beklemeye gerek yok
      User.findByIdAndUpdate(req.user._id, updateOp).exec();
    }

    if (decision === 'like') {
      // Eşleşme kontrolü: bu option için kaç "like" var?
      const likesForOption = await Swipe.countDocuments({
        room: roomId,
        optionId,
        decision: 'like',
      });

      if (room.participants.length >= 2 && likesForOption === room.participants.length) {
        // ── Tam eşleşme ────────────────────────────────────────────────
        const matchedOption = room.options.id(optionId);
        const matchResult = matchedOption || { name: 'Eslesme Saglandi' };

        await Room.findByIdAndUpdate(roomId, {
          status: 'finished',
          matchResult,
        });
        await User.updateMany(
          { _id: { $in: room.participants }, activeRoom: room._id },
          { $set: { activeRoom: null } }
        );

        getIo()?.to(roomId.toString()).emit('match_success', { itemId: optionId });

        return res.json({ match: true, matchedOption: matchResult });
      }
    }

    // Herkes tüm kartları oyladı mı? → iki countDocuments paralel çalıştır
    const [totalSwipesInRoom] = await Promise.all([
      Swipe.countDocuments({ room: roomId }),
    ]);

    const expectedSwipes = room.participants.length * room.options.length;

    if (totalSwipesInRoom >= expectedSwipes && room.status !== 'finished') {
      const updatedRoom = await finishRoomCalculation(roomId);
      return res.json({ match: false, finished: true, room: updatedRoom });
    }

    res.status(201).json({ match: false, finished: false });
  } catch (error) {
    next(error);
  }
};
