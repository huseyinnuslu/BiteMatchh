/**
 * userRoutes.js
 * BiteMatch – Kullanıcı profil ve arkadaş yönetimi rotaları
 *
 * Arkadaşlık akışı:
 *   POST   /friends/:id          → İstek gönder
 *   PUT    /friends/:id/accept   → İsteği kabul et
 *   DELETE /friends/:id/decline  → İsteği reddet
 *   DELETE /friends/:id          → Arkadaşı çıkar
 */

import express from 'express';
import {
  getProfile,
  searchUsers,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getUserProfile,
  followUser,
  unfollowUser,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tüm rotalar JWT koruması altında
router.use(protect);

// Profil
router.get('/profile', getProfile);
router.get('/profile/:id', getUserProfile);

// Kullanıcı arama
router.get('/search', searchUsers);

// Arkadaş listesi
router.get('/friends', getFriends);

// Arkadaş işlemleri
router.post('/friends/:id', sendFriendRequest);
router.delete('/friends/:id/cancel', cancelFriendRequest);
router.put('/friends/:id/accept', acceptFriendRequest);

// Arkadaşlık isteği reddet
router.delete('/friends/:id/decline', declineFriendRequest);

// Arkadaşı çıkar
router.delete('/friends/:id', removeFriend);

// Engelleme
router.get('/blocked',         getBlockedUsers);
router.post('/block/:id',      blockUser);
router.delete('/block/:id',    unblockUser);

// ── Takip İşlemleri ───────────────────────────────────────────────────────
// Kullanıcıyı takip et
router.post('/follow/:id', followUser);
// Kullanıcıyı takipten çık
router.post('/unfollow/:id', unfollowUser);

export default router;
