/**
 * seedEvents.js  (backend/scripts/)
 * BiteMatch – Veritabanı temizleme aracı
 *
 * Bu script sahte/hardcoded etkinlik EKLEMEZ.
 * Sadece eski canlı etkinlikleri siler.
 * Gerçek etkinlik verisi için: node scripts/fetchLiveEvents.js
 *
 * Çalıştırma: cd backend && node scripts/seedEvents.js
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Minimal schema — sadece sorgulama için
const candidateSchema = new mongoose.Schema(
  { isLiveEvent: { type: Boolean, default: false } },
  { strict: false, timestamps: true }
);
const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  const { deletedCount } = await Candidate.deleteMany({ isLiveEvent: true });
  console.log(`🧹 ${deletedCount} canlı etkinlik silindi.`);
  console.log('\n✅ DB temizlendi.');
  console.log('📡 Gerçek veri için: node scripts/fetchLiveEvents.js\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error('💥', err.message); process.exit(1); });
