/**
 * userController.js
 * BiteMatch – Kullanıcı profil ve arkadaş yönetimi
 *
 * Arkadaşlık akışı:
 *   A → POST /api/users/friends/:B_id    → B'nin pendingFriendRequests'ine A eklenir
 *   B → PUT  /api/users/friends/:A_id/accept  → friends karşılıklı eklenir, pending temizlenir
 *   B → DEL  /api/users/friends/:A_id/decline → pending'den silinir
 *   A → DEL  /api/users/friends/:B_id         → friends'ten karşılıklı çıkarılır
 */

import User from '../models/User.js';
import Swipe from '../models/Swipe.js';
import Room from '../models/Room.js';
import {
  calculateCompatibility,
  calculateFriendCompatibilities,
} from '../utils/compatibilityHelper.js';

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Profil bilgileri + istatistik özeti
// @route   GET /api/users/profile
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('friends', 'username name createdAt')          // nested alan seçimi kaldırıldı
      .populate('pendingFriendRequests', 'username name createdAt')
      .lean();

    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    // ── Swipe + Oda istatistiklerini paralel çek ──────────────────────────
    const [swipeStats, roomStats, categoryData] = await Promise.all([
      Swipe.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalSwipes: { $sum: 1 },
            totalLikes: {
              $sum: { $cond: [{ $eq: ['$decision', 'like'] }, 1, 0] },
            },
          },
        },
      ]),
      Room.aggregate([
        { $match: { participants: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Swipe.aggregate([
        { $match: { user: userId, decision: 'like' } },
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomInfo',
          },
        },
        { $unwind: '$roomInfo' },
        { $group: { _id: '$roomInfo.category', count: { $sum: 1 } } },
      ]),
    ]);

    const totalSwipes = swipeStats[0]?.totalSwipes || 0;
    const totalLikes  = swipeStats[0]?.totalLikes  || 0;
    const likeRatio   = totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0;

    const roomStatusMap = Object.fromEntries(roomStats.map(r => [r._id, r.count]));
    const categoryDistribution = Object.fromEntries(
      categoryData.map(c => [c._id || 'custom', c.count])
    );

    // Arkadaş uyum skorları
    const friendIds = (user.friends || []).map(f => f._id);
    const compatibilityScores = await calculateFriendCompatibilities(userId, friendIds);
    const scoreMap = Object.fromEntries(compatibilityScores.map(s => [s.friendId, s.score]));

    const friendsWithScores = (user.friends || []).map(f => ({
      ...f,
      compatibilityScore: scoreMap[f._id.toString()] || 0,
    }));

    res.json({
      _id:       user._id,
      name:      user.name,
      username:  user.username,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,

      stats: {
        totalSwipes,
        totalLikes,
        likeRatio,
        categoryDistribution,
        totalRooms: Object.values(roomStatusMap).reduce((a, b) => a + b, 0),
        completedRooms: roomStatusMap['finished'] || 0,
        averageDecisionTime: user.stats?.averageDecisionTime || 0,
      },

      friends:    friendsWithScores,
      friendCount: friendsWithScores.length,

      // Gelen bekleyen istekler
      pendingFriendRequests: user.pendingFriendRequests || [],
      pendingCount: (user.pendingFriendRequests || []).length,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcı arama
// @route   GET /api/users/search?q=username
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json([]);

    // Arama yapanın kendi bilgilerini al (arkadaş/istek durumunu göster)
    const me = await User.findById(req.user._id)
      .select('friends pendingFriendRequests')
      .lean();

    const users = await User.find({
      _id:      { $ne: req.user._id },
      username: { $regex: q, $options: 'i' },
    })
      .select('username name createdAt pendingFriendRequests')
      .limit(10)
      .lean();

    const myFriendIds   = (me.friends || []).map(id => id.toString());
    const mySentIds     = users
      .filter(u => (u.pendingFriendRequests || []).map(id => id.toString()).includes(req.user._id.toString()))
      .map(u => u._id.toString());

    const result = users.map(u => ({
      _id:      u._id,
      username: u.username,
      name:     u.name,
      isFriend: myFriendIds.includes(u._id.toString()),
      isPending: mySentIds.includes(u._id.toString()), // istek zaten gönderildi mi?
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaşlık isteği gönder
// @route   POST /api/users/friends/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const sendFriendRequest = async (req, res, next) => {
  try {
    const toId   = req.params.id;
    const fromId = req.user._id;

    if (toId === fromId.toString()) {
      res.status(400);
      throw new Error('Kendinize istek gönderemezsiniz');
    }

    // Hedef kullanıcı + kendi bilgilerimi paralel çek
    const [target, me] = await Promise.all([
      User.findById(toId).select('friends pendingFriendRequests'),
      User.findById(fromId).select('friends'),
    ]);

    if (!target) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    const targetFriendIds = target.friends.map(id => id.toString());
    const myFriendIds     = me.friends.map(id => id.toString());
    const toIdStr         = toId.toString();
    const fromIdStr       = fromId.toString();

    // Her iki yönde arkadaş kontrolü (eski tek yönlü kayıtları da yakalar)
    if (targetFriendIds.includes(fromIdStr) || myFriendIds.includes(toIdStr)) {
      // Eski sistemden kalma tek yönlü arkadaşlığı otomatik çift yönlü yap
      await Promise.all([
        User.findByIdAndUpdate(toId,   { $addToSet: { friends: fromId } }),
        User.findByIdAndUpdate(fromId, { $addToSet: { friends: toId   } }),
      ]);
      res.status(400);
      throw new Error('Bu kullanıcı zaten arkadaşınız');
    }

    // İstek zaten gönderilmiş mi?
    if (target.pendingFriendRequests.map(id => id.toString()).includes(fromIdStr)) {
      res.status(400);
      throw new Error('Arkadaşlık isteği zaten gönderildi');
    }

    // Karşı tarafın bize zaten istek göndermiş olması — direkt kabul et
    const me2 = await User.findById(fromId).select('pendingFriendRequests');
    if (me2.pendingFriendRequests.map(id => id.toString()).includes(toIdStr)) {
      await Promise.all([
        User.findByIdAndUpdate(fromId, {
          $addToSet: { friends: toId },
          $pull:     { pendingFriendRequests: toId },
        }),
        User.findByIdAndUpdate(toId, {
          $addToSet: { friends: fromId },
        }),
      ]);
      return res.json({ message: 'Karşılıklı istek vardı — arkadaş olundu! 🎉', autoAccepted: true });
    }

    // Normal akış: B'nin pending listesine A'yı ekle
    await User.findByIdAndUpdate(toId, {
      $addToSet: { pendingFriendRequests: fromId },
    });

    res.json({ message: 'Arkadaşlık isteği gönderildi' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaşlık isteğini kabul et
// @route   PUT /api/users/friends/:id/accept
// @access  Private   (req.user = kabul eden, :id = isteği gönderen)
// ──────────────────────────────────────────────────────────────────────────────
export const acceptFriendRequest = async (req, res, next) => {
  try {
    const fromId = req.params.id;   // isteği gönderenin id'si
    const toId   = req.user._id;    // kabul eden (biz)

    // İstek gerçekten var mı?
    const me = await User.findById(toId).select('pendingFriendRequests');
    const hasPending = me.pendingFriendRequests.map(id => id.toString()).includes(fromId);
    if (!hasPending) {
      res.status(400);
      throw new Error('Bu kullanıcıdan bekleyen bir istek yok');
    }

    // Karşılıklı friends'e ekle + pending'den sil (paralel)
    await Promise.all([
      User.findByIdAndUpdate(toId, {
        $addToSet: { friends: fromId },
        $pull:     { pendingFriendRequests: fromId },
      }),
      User.findByIdAndUpdate(fromId, {
        $addToSet: { friends: toId },
      }),
    ]);

    // Uyum skorunu hesapla
    const score = await calculateCompatibility(toId, fromId);

    res.json({
      message: 'Arkadaşlık isteği kabul edildi',
      compatibilityScore: score,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaşlık isteğini reddet
// @route   DELETE /api/users/friends/:id/decline
// @access  Private   (req.user = reddeden, :id = isteği gönderen)
// ──────────────────────────────────────────────────────────────────────────────
export const declineFriendRequest = async (req, res, next) => {
  try {
    const fromId = req.params.id;
    const toId   = req.user._id;

    await User.findByIdAndUpdate(toId, {
      $pull: { pendingFriendRequests: fromId },
    });

    res.json({ message: 'Arkadaşlık isteği reddedildi' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaşı çıkar (çift taraflı)
// @route   DELETE /api/users/friends/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const removeFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const userId   = req.user._id;

    // Karşılıklı çıkar
    await Promise.all([
      User.findByIdAndUpdate(userId,   { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId   } }),
    ]);

    res.json({ message: 'Arkadaş listeden çıkarıldı' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaş listesi + uyum skorları
// @route   GET /api/users/friends
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('friends')
      .populate('friends', 'username name createdAt')
      .lean();

    const friendIds = (user.friends || []).map(f => f._id);
    const scores    = await calculateFriendCompatibilities(req.user._id, friendIds);
    const scoreMap  = Object.fromEntries(scores.map(s => [s.friendId, s.score]));

    const friends = (user.friends || [])
      .map(f => ({ ...f, compatibilityScore: scoreMap[f._id.toString()] || 0 }))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(friends);
  } catch (error) {
    next(error);
  }
};
