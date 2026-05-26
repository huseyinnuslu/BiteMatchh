import Swipe from '../models/Swipe.js';
import Room from '../models/Room.js';
import { finishRoomCalculation } from '../utils/roomHelper.js';

// @desc    Kaydırma (Like/Dislike) kaydet ve sonucu kontrol et
// @route   POST /api/swipes
// @access  Private
export const recordSwipe = async (req, res, next) => {
  try {
    const { roomId, optionId, decision } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404);
      throw new Error('Oda bulunamadı');
    }

    let swipe = await Swipe.findOne({ room: roomId, user: req.user._id, optionId });
    if (swipe) {
      swipe.decision = decision;
      await swipe.save();
    } else {
      swipe = await Swipe.create({
        room: roomId,
        user: req.user._id,
        optionId,
        decision,
      });
    }

    if (decision === 'like') {
      const likesForOption = await Swipe.countDocuments({
        room: roomId,
        optionId: optionId,
        decision: 'like',
      });

      // Herkes bu seçeneği beğendiyse
      if (room.participants.length > 0 && likesForOption === room.participants.length) {
        room.status = 'finished';
        
        const matchedOption = room.options.id(optionId);
        room.matchResult = matchedOption ? matchedOption : { name: 'Eşleşme Sağlandı' };
        
        await room.save();
        
        return res.json({ match: true, matchedOption: room.matchResult, room });
      }
    }

    // %100 eşleşme olmadı, peki herkes oylamayı bitirdi mi?
    const totalSwipesInRoom = await Swipe.countDocuments({ room: roomId });
    const expectedSwipes = room.participants.length * room.options.length;

    if (totalSwipesInRoom === expectedSwipes && room.status !== 'finished') {
      const updatedRoom = await finishRoomCalculation(roomId);
      return res.json({ match: false, finished: true, room: updatedRoom });
    }

    res.status(201).json({ match: false, swipe, finished: false });
  } catch (error) {
    next(error);
  }
};
