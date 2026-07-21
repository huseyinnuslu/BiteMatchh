/**
 * userRoutes.js
 * BiteMatch – Kullanıcı profil ve arkadaş yönetimi rotaları
 */

import express from 'express';
import {
  getProfile,
  searchUsers,
  addFriend,
  removeFriend,
  getFriends,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tüm rotalar JWT koruması altında
router.use(protect);

// Profil
router.get('/profile', getProfile);

// Kullanıcı arama (arkadaş bul)
router.get('/search', searchUsers);

// Arkadaş yönetimi
router.get('/friends', getFriends);
router.post('/friends/:id', addFriend);
router.delete('/friends/:id', removeFriend);

export default router;
