import Swipe from '../models/Swipe.js';
import Room from '../models/Room.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';

// @desc    Kaydırma (Like/Dislike) kaydet ve sonucu kontrol et
// @route   POST /api/swipes
// @access  Private
// Optimizasyon:
//   - findOne + save (2 sorgu) → findOneAndUpdate upsert (1 sorgu)
//   - Room sadece gerekli alanlarla çekilir
//   - countDocuments paralel çalıştırılır
export const recordSwipe = async (req, res, next) => {
  try {
    const { roomId, optionId, decision } = req.body;

    // Sadece gerekli alanları çek: participants, options, status, matchResult
    const room = await Room.findById(roomId).select(
      'participants options status matchResult'
    );

    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    if (room.status === 'finished') {
      return res.status(400).json({ message: 'Oylama zaten tamamlandı' });
    }

    // findOneAndUpdate + upsert: tek sorguda "varsa güncelle, yoksa oluştur"
    // Swipe şemasındaki { room, user, optionId } unique index bu sorguyu hızlandırır
    await Swipe.findOneAndUpdate(
      { room: roomId, user: req.user._id, optionId },
      { decision },
      { upsert: true, new: true }
    );

    if (decision === 'like') {
      // Eşleşme kontrolü: bu option için kaç "like" var?
      const likesForOption = await Swipe.countDocuments({
        room: roomId,
        optionId,
        decision: 'like',
      });

      if (room.participants.length > 0 && likesForOption === room.participants.length) {
        // ── Tam eşleşme ────────────────────────────────────────────────
        const matchedOption = room.options.id(optionId);
        const matchResult = matchedOption || { name: 'Eslesme Saglandi' };

        await Room.findByIdAndUpdate(roomId, {
          status: 'finished',
          matchResult,
        });

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
