import Room from '../models/Room.js';
import Swipe from '../models/Swipe.js';

/**
 * Oylamayı bitirir, grup uyum yüzdesini ve en popüler 3 seçeneği hesaplar.
 * @param {string} roomId 
 * @returns {Promise<object>} Güncellenmiş oda objesi
 */
export const finishRoomCalculation = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) return null;
  if (room.status === 'finished') return room;

  room.status = 'finished';

  const totalSwipesInRoom = await Swipe.countDocuments({ room: roomId });
  const expectedSwipes = room.participants.length * room.options.length;

  // Toplam like sayısını bul
  const totalLikes = await Swipe.countDocuments({ room: roomId, decision: 'like' });
  
  // Sıfıra bölünmeyi engelle
  const divisor = expectedSwipes || 1;
  const compatibilityPercentage = Math.round((totalLikes / divisor) * 100) || 0;

  // En çok beğenilen 3 seçeneği bul (Aggregate sorgusu)
  const topLikedSwipes = await Swipe.aggregate([
    { $match: { room: room._id, decision: 'like' } },
    { $group: { _id: "$optionId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 3 }
  ]);

  const topOptions = topLikedSwipes.map(ts => {
    const opt = room.options.id(ts._id);
    if (opt) {
      return {
        _id: opt._id,
        name: opt.name,
        imageUrl: opt.imageUrl,
        rating: opt.rating,
        budget: opt.budget,
        description: opt.description,
        likeCount: ts.count
      };
    }
    return null;
  }).filter(Boolean);

  room.compatibilityPercentage = compatibilityPercentage;
  room.topOptions = topOptions;
  
  await room.save();
  return room;
};
