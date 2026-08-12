import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import sharp from 'sharp';
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
    metadata: { userId: userId.toString(), avatarOptimized: true },
  });

  uploadStream.once('finish', () => resolve(uploadStream.id));
  uploadStream.once('error', reject);
  uploadStream.end(file.buffer);
});

// Avatar, ekranda en fazla küçük bir daire olarak gösterilir. Telefonda 4-5 MB
// kameradan çıkmış bir fotoğrafı her menüde indirmek yerine, yükleme anında
// kare ve yüksek kaliteli ama hafif bir WebP sürümü oluşturuyoruz.
const optimizeAvatar = async (file) => ({
  buffer: await sharp(file.buffer)
    .rotate()
    .resize(512, 512, { fit: 'cover', position: 'attention', withoutEnlargement: true })
    .webp({ quality: 86, effort: 4 })
    .toBuffer(),
  mimetype: 'image/webp',
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
    // Sürümlü URL (`?v=...`) yeni fotoğraf yüklendiğinde değişir. Böylece
    // tarayıcı aynı fotoğrafı her ekranda yeniden indirmez; yeni fotoğraf da
    // eski önbelleğin yerine yanlışlıkla gösterilmez.
    const hasVersion = typeof req.query.v === 'string' && req.query.v.length > 0;
    res.set({
      'Content-Type': file.contentType || 'image/jpeg',
      'Cache-Control': hasVersion
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300, stale-while-revalidate=86400',
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
    const optimizedAvatar = await optimizeAvatar(req.file);
    const newFileId = await writeAvatar(optimizedAvatar, user._id);
    await deleteStoredAvatars(user._id, newFileId);

    const version = Date.now();
    // Kalıcı kayıtta da sürüm tutuyoruz; sayfa yenilendiğinde bile tarayıcı
    // doğru görseli önbellekten anında kullanabilir.
    const avatarUrl = `/api/upload/avatar/${user._id}?v=${version}`;
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
