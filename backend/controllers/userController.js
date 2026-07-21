/**
 * userController.js
 * BiteMatch – Kullanıcı profil ve arkadaş yönetimi
 *
 * Endpoints:
 *   GET  /api/users/profile          → Profil + istatistik özeti
 *   GET  /api/users/search?q=...     → Kullanıcı arama (arkadaş eklemek için)
 *   POST /api/users/friends/:id      → Arkadaş ekle
 *   DELETE /api/users/friends/:id    → Arkadaş çıkar
 *   GET  /api/users/friends          → Arkadaş listesi + uyum skorları
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

    // Profil ve arkadaş listesini tek sorguda getir
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('friends', 'username name stats.totalSwipes createdAt')
      .lean();

    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    // ── Swipe istatistiklerini aggregate ile hesapla ───────────────────────
    const [swipeStats, roomStats] = await Promise.all([
      // Toplam swipe, like sayısı, kategori dağılımı
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
      // Katıldığı oda sayısı ve tamamlanan oda sayısı
      Room.aggregate([
        { $match: { participants: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Kategori bazlı like dağılımı: hangi odadaki hangi kategoride
    const categoryData = await Swipe.aggregate([
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
      {
        $group: {
          _id: '$roomInfo.category',
          count: { $sum: 1 },
        },
      },
    ]);

    // Sonuçları derle
    const totalSwipes = swipeStats[0]?.totalSwipes || 0;
    const totalLikes = swipeStats[0]?.totalLikes || 0;
    const likeRatio = totalSwipes > 0
      ? Math.round((totalLikes / totalSwipes) * 100)
      : 0;

    const roomStatusMap = Object.fromEntries(
      roomStats.map((r) => [r._id, r.count])
    );
    const categoryDistribution = Object.fromEntries(
      categoryData.map((c) => [c._id || 'custom', c.count])
    );

    // Arkadaşlarla uyum skorları (paralel hesaplama)
    const friendIds = (user.friends || []).map((f) => f._id);
    const compatibilityScores = await calculateFriendCompatibilities(
      userId,
      friendIds
    );

    // Uyum skorlarını arkadaş bilgisiyle birleştir
    const friendsWithScores = (user.friends || []).map((friend) => {
      const scoreEntry = compatibilityScores.find(
        (c) => c.friendId === friend._id.toString()
      );
      return {
        ...friend,
        compatibilityScore: scoreEntry?.score || 0,
      };
    });

    res.json({
      // Temel profil
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,

      // İstatistik özeti
      stats: {
        totalSwipes,
        totalLikes,
        likeRatio,                // Beğenme oranı %
        categoryDistribution,     // { yemek: 5, film: 3, ... }
        totalRooms:
          (roomStatusMap['waiting'] || 0) +
          (roomStatusMap['voting'] || 0) +
          (roomStatusMap['finished'] || 0),
        completedRooms: roomStatusMap['finished'] || 0,
        averageDecisionTime: user.stats?.averageDecisionTime || 0,
      },

      // Arkadaş listesi (uyum skoruyla)
      friends: friendsWithScores,
      friendCount: friendsWithScores.length,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcı arama (arkadaş eklemek için)
// @route   GET /api/users/search?q=username
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user._id },          // kendini gösterme
      username: { $regex: q, $options: 'i' },
    })
      .select('username name createdAt')
      .limit(10)
      .lean();

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaş ekle
// @route   POST /api/users/friends/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const addFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id;

    if (friendId === userId.toString()) {
      res.status(400);
      throw new Error('Kendinizi arkadaş olarak ekleyemezsiniz');
    }

    // Eklenecek kullanıcı var mı?
    const friendExists = await User.exists({ _id: friendId });
    if (!friendExists) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    // $addToSet: zaten arkadaşsa tekrar ekleme
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { friends: friendId } },
      { new: true }
    )
      .select('friends')
      .populate('friends', 'username name')
      .lean();

    // Uyum skoru hesapla
    const score = await calculateCompatibility(userId, friendId);

    res.json({
      message: 'Arkadaş başarıyla eklendi',
      friendCount: updatedUser.friends.length,
      compatibilityScore: score,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Arkadaş çıkar
// @route   DELETE /api/users/friends/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const removeFriend = async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });

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
      .populate('friends', 'username name stats.totalSwipes createdAt')
      .lean();

    const friendIds = (user.friends || []).map((f) => f._id);
    const scores = await calculateFriendCompatibilities(req.user._id, friendIds);

    const scoreMap = Object.fromEntries(scores.map((s) => [s.friendId, s.score]));

    const friends = (user.friends || []).map((f) => ({
      ...f,
      compatibilityScore: scoreMap[f._id.toString()] || 0,
    }));

    // Uyum skoruna göre sırala (en yüksek üstte)
    friends.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(friends);
  } catch (error) {
    next(error);
  }
};
