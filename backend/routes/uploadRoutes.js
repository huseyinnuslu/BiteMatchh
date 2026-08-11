import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { getIo } from '../server.js';

const router = express.Router();

// Render'ın yerel diski kalıcı değildir. Avatarları MongoDB GridFS'te tutarak
// deploy/restart sonrasında da erişilebilir kalmalarını sağlıyoruz.
const avatarBucket = () => new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' });

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Sadece resim dosyaları yüklenebilir.'), false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const deleteStoredAvatars = async (userId, exceptFileId = null) => {
  const bucket = avatarBucket();
  const files = await bucket.find({ 'metadata.userId': userId.toString() }).toArray();
  await Promise.all(
    files
      .filter((file) => !exceptFileId || !file._id.equals(exceptFileId))
      .map((file) => bucket.delete(file._id)),
  );
};

const emitAvatarUpdated = (user, avatarUrl, version) => {
  (user.friends || []).forEach((friendId) => {
    getIo()?.to(`user:${friendId.toString()}`).emit('profile_avatar_updated', {
      userId: user._id.toString(), avatarUrl, version,
    });
  });
};

const writeAvatar = (file, userId) => new Promise((resolve, reject) => {
  const uploadStream = avatarBucket().openUploadStream(`${userId}-${Date.now()}`, {
    contentType: file.mimetype,
    metadata: { userId: userId.toString() },
  });

  uploadStream.once('finish', () => resolve(uploadStream.id));
  uploadStream.once('error', reject);
  uploadStream.end(file.buffer);
});

// @route   GET /api/upload/avatar/:userId
// @desc    MongoDB'de kalıcı saklanan profil fotoğrafını yayınla
// @access  Public (profil fotoğrafları uygulamada herkese açıktır)
router.get('/avatar/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      res.status(400);
      throw new Error('Geçersiz kullanıcı');
    }

    const bucket = avatarBucket();
    const [file] = await bucket
      .find({ 'metadata.userId': req.params.userId })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();

    if (!file) {
      res.status(404);
      throw new Error('Profil fotoğrafı bulunamadı');
    }

    // Aynı URL yeniden açıldığında dahi güncel fotoğrafı doğrular; yükleme
    // sonrasında eklenen ?v= sürümü ise açık ekranları anında yeniler.
    res.set({
      'Content-Type': file.contentType || 'image/jpeg',
      'Cache-Control': 'no-store, max-age=0',
    });
    bucket.openDownloadStream(file._id).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/upload/avatar
// @desc    Kullanıcı profil fotoğrafı yükle
// @access  Private
router.post('/avatar', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Lütfen bir resim seçin');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    // Yeni yükleme başarıyla tamamlanmadan eski fotoğraf silinmez.
    const newFileId = await writeAvatar(req.file, user._id);
    await deleteStoredAvatars(user._id, newFileId);

    const avatarUrl = `/api/upload/avatar/${user._id}`;
    const version = Date.now();
    user.profilePic = avatarUrl;
    await user.save();
    emitAvatarUpdated(user, avatarUrl, version);

    res.json({
      message: 'Profil fotoğrafı başarıyla güncellendi',
      avatarUrl,
      version,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/upload/avatar
// @desc    Kullanıcı profil fotoğrafını sil
// @access  Private
router.delete('/avatar', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }

    await deleteStoredAvatars(user._id);
    user.profilePic = '';
    await user.save();
    const version = Date.now();
    emitAvatarUpdated(user, '', version);

    res.json({ message: 'Profil fotoğrafı kaldırıldı' });
  } catch (error) {
    next(error);
  }
});

export default router;
