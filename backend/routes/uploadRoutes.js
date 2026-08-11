import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { getIo } from '../server.js';

const router = express.Router();

// Uploads klasörünü oluştur (varsa bir şey yapma)
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Benzersiz dosya ismi: userId-timestamp.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.user._id.toString() + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimum 5MB
  fileFilter: fileFilter
});

// @route   POST /api/upload/avatar
// @desc    Kullanıcı profil fotoğrafı (avatar) yükle
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

    // Dosya yolunu frontend'in erişebileceği URL formatına çevir
    // req.file.filename örn: 669a1b...-1234.png
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Veritabanını güncelle
    user.profilePic = avatarUrl;
    await user.save();
    const version = Date.now();
    (user.friends || []).forEach((friendId) => {
      getIo()?.to(`user:${friendId.toString()}`).emit('profile_avatar_updated', {
        userId: user._id.toString(), avatarUrl, version,
      });
    });

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

    if (user.profilePic) {
      const filePath = path.join(process.cwd(), user.profilePic);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      user.profilePic = '';
      await user.save();
      const version = Date.now();
      (user.friends || []).forEach((friendId) => {
        getIo()?.to(`user:${friendId.toString()}`).emit('profile_avatar_updated', {
          userId: user._id.toString(), avatarUrl: '', version,
        });
      });
    }

    res.json({ message: 'Profil fotoğrafı kaldırıldı' });
  } catch (error) {
    next(error);
  }
});

export default router;
