import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import sharp from 'sharp';
import User from '../models/User.js';

const avatarBucket = () => new GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' });

const optimizeBuffer = (buffer) => sharp(buffer)
  .rotate()
  .resize(512, 512, { fit: 'cover', position: 'attention', withoutEnlargement: true })
  .webp({ quality: 86, effort: 4 })
  .toBuffer();

const readFile = (bucket, fileId) => new Promise((resolve, reject) => {
  const chunks = [];
  bucket.openDownloadStream(fileId)
    .on('data', (chunk) => chunks.push(chunk))
    .on('error', reject)
    .on('end', () => resolve(Buffer.concat(chunks)));
});

const storeOptimizedAvatar = (bucket, userId, buffer) => new Promise((resolve, reject) => {
  const upload = bucket.openUploadStream(`${userId}-${Date.now()}`, {
    contentType: 'image/webp',
    metadata: { userId: userId.toString(), avatarOptimized: true },
  });
  upload.once('finish', () => resolve(upload.id));
  upload.once('error', reject);
  upload.end(buffer);
});

// Eski kullanıcılar avatarı kameradan çıktığı orijinal boyutta yüklemiş olabilir.
// Deploy sonrasında bu işlem yalnızca eski dosyaları bir kere dönüştürür; mobilde
// profil/mesajlar/navbar artık hafif, önbelleklenebilir WebP avatar kullanır.
export const optimizeExistingAvatars = async () => {
  const bucket = avatarBucket();
  const files = await bucket.find({ 'metadata.avatarOptimized': { $ne: true } }).toArray();
  for (const file of files) {
    const userId = file.metadata?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) continue;
    try {
      const webp = await optimizeBuffer(await readFile(bucket, file._id));
      const newFileId = await storeOptimizedAvatar(bucket, userId, webp);
      const version = Date.now();
      await User.updateOne(
        { _id: userId },
        { $set: { profilePic: `/api/upload/avatar/${userId}?v=${version}` } },
      );
      await bucket.delete(file._id);
      console.log(`Optimized avatar ${newFileId} for user ${userId}`);
    } catch (error) {
      // Bir görsel dönüştürülemese bile uygulamanın açılışını engellemez.
      console.warn(`Avatar optimization skipped for ${userId}: ${error.message}`);
    }
  }
};
