/**
 * userController.js
 * BiteMatch – Kullanıcı profil ve arkadaş yönetimi
 *
 * Arkadaşlık akışı:
 *   A → POST /api/users/friends/:B_id         → B'nin pendingFriendRequests'ine A eklenir
 *   B → PUT  /api/users/friends/:A_id/accept  → friends karşılıklı eklenir, pending temizlenir
 *   B → DEL  /api/users/friends/:A_id/decline → pending'den silinir
 *   A → DEL  /api/users/friends/:B_id         → friends'ten karşılıklı çıkarılır
 */

import mongoose from 'mongoose';
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
    const userId = mongoose.Types.ObjectId.createFromHexString
      ? mongoose.Types.ObjectId.createFromHexString(req.user._id.toString())
      : new mongoose.Types.ObjectId(req.user._id.toString());

    // ── User + friends + pendingRequests aggregation (tek sorgu) ─────────
    const [userAgg] = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'users',
          let: { friendIds: '$friends' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$friendIds', []] }] } } },
            { $project: { username: 1, name: 1, createdAt: 1 } },
          ],
          as: 'friendDocs',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { reqIds: '$pendingFriendRequests' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$reqIds', []] }] } } },
            { $project: { username: 1, name: 1, createdAt: 1 } },
          ],
          as: 'pendingDocs',
        },
      },
      {
        $project: {
          password: 0,
          resetPasswordToken: 0,
          resetPasswordExpire: 0,
        },
      },
    ]);

    if (!userAgg) {
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
        { $unwind: { path: '$roomInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: { $ifNull: ['$roomInfo.category', 'custom'] }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalSwipes = swipeStats[0]?.totalSwipes || 0;
    const totalLikes  = swipeStats[0]?.totalLikes  || 0;
    const likeRatio   = totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0;

    const roomStatusMap = Object.fromEntries(roomStats.map(r => [r._id, r.count]));
    const categoryDistribution = Object.fromEntries(
      categoryData.map(c => [c._id || 'custom', c.count])
    );

    // ── Arkadaş uyum skorları ──────────────────────────────────────────────
    const friendDocs = userAgg.friendDocs || [];
    const friendIds  = friendDocs.map(f => f._id);
    const scores     = await calculateFriendCompatibilities(userId, friendIds);
    const scoreMap   = Object.fromEntries(scores.map(s => [s.friendId, s.score]));

    const friendsWithScores = friendDocs.map(f => ({
      _id:      f._id,
      username: f.username,
      name:     f.name,
      createdAt: f.createdAt,
      compatibilityScore: scoreMap[f._id.toString()] || 0,
    }));

    res.json({
      _id:       userAgg._id,
      name:      userAgg.name,
      username:  userAgg.username,
      email:     userAgg.email,
      role:      userAgg.role,
      createdAt: userAgg.createdAt,

      stats: {
        totalSwipes,
        totalLikes,
        likeRatio,
        categoryDistribution,
        totalRooms: Object.values(roomStatusMap).reduce((a, b) => a + b, 0),
        completedRooms: roomStatusMap['finished'] || 0,
        averageDecisionTime: userAgg.stats?.averageDecisionTime || 0,
      },

      friends:     friendsWithScores,
      friendCount: friendsWithScores.length,

      pendingFriendRequests: userAgg.pendingDocs || [],
      pendingCount: (userAgg.pendingDocs || []).length,
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

    const myFriendIds = (me.friends || []).map(id => id.toString());

    const result = users.map(u => {
      // karşı tarafın pending listesinde ben var mıyım? → istek gönderdim demektir
      const isPending = (u.pendingFriendRequests || [])
        .map(id => id.toString())
        .includes(req.user._id.toString());

      return {
        _id:       u._id,
        username:  u.username,
        name:      u.name,
        isFriend:  myFriendIds.includes(u._id.toString()),
        isPending,
      };
    });

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
    const fromId = req.user._id.toString();

    if (toId === fromId) {
      res.status(400);
      throw new Error('Kendinize istek gönderemezsiniz');
    }

    // Hedef kullanıcı + kendi bilgilerimi paralel çek
    const [target, me] = await Promise.all([
      User.findById(toId).select('friends pendingFriendRequests username'),
      User.findById(fromId).select('friends pendingFriendRequests'),
    ]);

    if (!target) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    const targetFriendIds = (target.friends || []).map(id => id.toString());
    const myFriendIds     = (me.friends || []).map(id => id.toString());
    const toIdStr         = toId.toString();

    // Her iki yönde arkadaş kontrolü — eski tek yönlü kayıtları da yakalar
    if (targetFriendIds.includes(fromId) || myFriendIds.includes(toIdStr)) {
      // Tek yönlü eski kaydı çift yönlü yap
      await Promise.all([
        User.findByIdAndUpdate(toId,   { $addToSet: { friends: fromId } }),
        User.findByIdAndUpdate(fromId, { $addToSet: { friends: toId   } }),
      ]);
      res.status(400);
      throw new Error('Bu kullanıcı zaten arkadaşınız');
    }

    // İstek zaten gönderilmiş mi?
    const alreadySent = (target.pendingFriendRequests || [])
      .map(id => id.toString()).includes(fromId);
    if (alreadySent) {
      res.status(400);
      throw new Error('Arkadaşlık isteği zaten gönderildi');
    }

    // Karşı taraf bize zaten istek göndermişse — direkt kabul et
    const theyRequestedMe = (me.pendingFriendRequests || [])
      .map(id => id.toString()).includes(toIdStr);
    if (theyRequestedMe) {
      await Promise.all([
        User.findByIdAndUpdate(fromId, {
          $addToSet: { friends: toId   },
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
    const fromId = req.params.id;
    const toId   = req.user._id.toString();

    const me = await User.findById(toId).select('pendingFriendRequests');
    const hasPending = (me.pendingFriendRequests || [])
      .map(id => id.toString()).includes(fromId);

    if (!hasPending) {
      res.status(400);
      throw new Error('Bu kullanıcıdan bekleyen bir istek yok');
    }

    await Promise.all([
      User.findByIdAndUpdate(toId, {
        $addToSet: { friends: fromId },
        $pull:     { pendingFriendRequests: fromId },
      }),
      User.findByIdAndUpdate(fromId, {
        $addToSet: { friends: toId },
      }),
    ]);

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
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const declineFriendRequest = async (req, res, next) => {
  try {
    const fromId = req.params.id;
    const toId   = req.user._id.toString();

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
    const userId   = req.user._id.toString();

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
    const userId = mongoose.Types.ObjectId.createFromHexString
      ? mongoose.Types.ObjectId.createFromHexString(req.user._id.toString())
      : new mongoose.Types.ObjectId(req.user._id.toString());

    const [userAgg] = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'users',
          let: { friendIds: '$friends' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$friendIds', []] }] } } },
            { $project: { username: 1, name: 1, createdAt: 1 } },
          ],
          as: 'friendDocs',
        },
      },
      { $project: { friendDocs: 1 } },
    ]);

    const friendDocs = userAgg?.friendDocs || [];
    const friendIds  = friendDocs.map(f => f._id);
    const scores     = await calculateFriendCompatibilities(userId, friendIds);
    const scoreMap   = Object.fromEntries(scores.map(s => [s.friendId, s.score]));

    const friends = friendDocs
      .map(f => ({
        _id:      f._id,
        username: f.username,
        name:     f.name,
        createdAt: f.createdAt,
        compatibilityScore: scoreMap[f._id.toString()] || 0,
      }))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(friends);
  } catch (error) {
    next(error);
  }
};
