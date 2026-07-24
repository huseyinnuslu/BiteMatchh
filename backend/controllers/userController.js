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
import Notification from '../models/Notification.js';
import { getIo } from '../server.js';
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
            { $project: { username: 1, name: 1, profilePic: 1, createdAt: 1 } },
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
            { $project: { username: 1, name: 1, profilePic: 1, createdAt: 1 } },
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
        { 
          $match: { 
            participants: userId,
            $expr: { $gte: [{ $size: "$participants" }, 2] }
          } 
        },
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

    const categoryBreakdown = {};
    if (totalLikes > 0) {
      for (const [cat, count] of Object.entries(categoryDistribution)) {
        categoryBreakdown[cat] = Math.round((count / totalLikes) * 100);
      }
    }

    // ── Arkadaş uyum skorları ──────────────────────────────────────────────
    const friendDocs = userAgg.friendDocs || [];
    const friendIds  = friendDocs.map(f => f._id);
    const scores     = await calculateFriendCompatibilities(userId, friendIds);
    const scoreMap   = Object.fromEntries(scores.map(s => [s.friendId, s.score]));

    const friendsWithScores = friendDocs.map(f => ({
      _id:      f._id,
      username: f.username,
      name:     f.name,
      profilePic: f.profilePic,
      createdAt: f.createdAt,
      compatibilityScore: scoreMap[f._id.toString()] || 0,
    }));

    res.json({
      _id:       userAgg._id,
      name:      userAgg.name,
      username:  userAgg.username,
      email:     userAgg.email,
      role:      userAgg.role,
      profilePic: userAgg.profilePic,
      isStatsPublic: userAgg.isStatsPublic !== undefined ? userAgg.isStatsPublic : true,
      followersCount: (userAgg.followers || []).length,
      followingCount: (userAgg.following || []).length,
      createdAt: userAgg.createdAt,

      stats: {
        totalSwipes,
        totalLikes,
        likeRatio,
        categoryDistribution,
        categoryBreakdown,
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
// @desc    Başka bir kullanıcının genel profilini getir
// @route   GET /api/users/profile/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const getUserProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const callerId = req.user._id.toString();

    const userAgg = await User.findById(targetUserId)
      .select('name username createdAt role friends isStatsPublic profilePic followers following pendingFriendRequests')
      .lean();

    if (!userAgg) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    const isFriend = (userAgg.friends || []).map(id => id.toString()).includes(callerId);
    const isFollowing = (userAgg.followers || []).map(id => id.toString()).includes(callerId);

    // Calculate stat logic similar to getProfile, but only if isStatsPublic is true
    let statsData = null;
    const isPublic = userAgg.isStatsPublic !== undefined ? userAgg.isStatsPublic : true;
    
    if (isPublic) {
      const tUserId = mongoose.Types.ObjectId.createFromHexString
        ? mongoose.Types.ObjectId.createFromHexString(userAgg._id.toString())
        : new mongoose.Types.ObjectId(userAgg._id.toString());

      const [swipeStats, categoryData] = await Promise.all([
        Swipe.aggregate([
          { $match: { user: tUserId } },
          {
            $group: {
              _id: null,
              totalSwipes: { $sum: 1 },
              totalLikes: { $sum: { $cond: [{ $eq: ['$decision', 'like'] }, 1, 0] } },
            },
          },
        ]),
        Swipe.aggregate([
          { $match: { user: tUserId, decision: 'like' } },
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
      
      const categoryDistribution = Object.fromEntries(
        categoryData.map(c => [c._id || 'custom', c.count])
      );

      const categoryBreakdown = {};
      if (totalLikes > 0) {
        for (const [cat, count] of Object.entries(categoryDistribution)) {
          categoryBreakdown[cat] = Math.round((count / totalLikes) * 100);
        }
      }

      statsData = {
        totalSwipes,
        totalLikes,
        categoryBreakdown,
      };
    }

    // isPending calculation: Am I in their pending requests?
    const isPending = (userAgg.pendingFriendRequests || []).map(id => id.toString()).includes(callerId);

    res.json({
      _id: userAgg._id,
      name: userAgg.name,
      username: userAgg.username,
      profilePic: userAgg.profilePic,
      role: userAgg.role,
      createdAt: userAgg.createdAt,
      isFriend,
      isPending,
      isFollowing,
      followersCount: (userAgg.followers || []).length,
      followingCount: (userAgg.following || []).length,
      friendCount: (userAgg.friends || []).length,
      isStatsPublic: isPublic,
      stats: statsData,
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

    const notification = await Notification.create({
      user: toId,
      message: `${req.user.username} size arkadaşlık isteği gönderdi`,
      type: 'friend_request',
      link: '/profile',
    });
    getIo()?.to(`user:${toId}`).emit('new_notification', notification);

    res.status(200).json({ message: 'Arkadaşlık isteği gönderildi' });
  } catch (error) {
    next(error);
  }
};

// ── Arkadaşlık isteğini geri çek (İptal et) ──────────────────────────────────
export const cancelFriendRequest = async (req, res, next) => {
  try {
    const toId = req.params.id;
    const fromId = req.user._id.toString();

    // Remove fromId from the target's pendingFriendRequests
    await User.findByIdAndUpdate(toId, {
      $pull: { pendingFriendRequests: fromId },
    });

    res.status(200).json({ message: 'Arkadaşlık isteği geri çekildi' });
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
            { $project: { username: 1, name: 1, profilePic: 1, createdAt: 1 } },
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
        profilePic: f.profilePic,
        createdAt: f.createdAt,
        compatibilityScore: scoreMap[f._id.toString()] || 0,
      }))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(friends);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanicıyi engelle
// @route   POST /api/users/block/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const blockUser = async (req, res, next) => {
  try {
    const myId     = req.user._id;
    const targetId = req.params.id;

    if (myId.toString() === targetId) {
      res.status(400); throw new Error('Kendinizi engelleyemezsiniz');
    }

    await User.findByIdAndUpdate(myId, {
      $addToSet: { blockedUsers: targetId },
      $pull:     { friends: targetId },        // arkadaşlıktan da cıkar
    });
    // Karşı tarafı da arkadaşlıktan çıkar
    await User.findByIdAndUpdate(targetId, { $pull: { friends: myId } });

    res.json({ message: 'Kullanıcı engellendi' });
  } catch (e) { next(e); }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Engeli kaldir
// @route   DELETE /api/users/block/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const unblockUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id },
    });
    res.json({ message: 'Engel kaldırıldı' });
  } catch (e) { next(e); }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Engellenen kullanicilari listele
// @route   GET /api/users/blocked
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const getBlockedUsers = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .select('blockedUsers')
      .populate('blockedUsers', 'username')
      .lean();
    res.json(me?.blockedUsers || []);
  } catch (e) { next(e); }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcıyı Takip Et
// @route   POST /api/users/follow/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const myId = req.user._id;

    if (targetId === myId.toString()) {
      res.status(400);
      throw new Error('Kendinizi takip edemezsiniz');
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    // Zaten takip ediyorsa işlem yapma
    if (targetUser.followers && targetUser.followers.includes(myId)) {
      return res.json({ message: 'Zaten takip ediyorsunuz' });
    }

    // Karşı tarafa beni follower olarak ekle
    await User.findByIdAndUpdate(targetId, {
      $addToSet: { followers: myId }
    });

    // Kendi hesabıma karşı tarafı following olarak ekle
    await User.findByIdAndUpdate(myId, {
      $addToSet: { following: targetId }
    });

    res.json({ message: 'Kullanıcı takip edildi' });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// @desc    Kullanıcıyı Takipten Çık
// @route   POST /api/users/unfollow/:id
// @access  Private
// ──────────────────────────────────────────────────────────────────────────────
export const unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const myId = req.user._id;

    // Karşı taraftan beni follower'dan çıkar
    await User.findByIdAndUpdate(targetId, {
      $pull: { followers: myId }
    });

    // Kendi hesabımdan karşı tarafı following'den çıkar
    await User.findByIdAndUpdate(myId, {
      $pull: { following: targetId }
    });

    res.json({ message: 'Kullanıcı takipten çıkarıldı' });
  } catch (error) {
    next(error);
  }
};
