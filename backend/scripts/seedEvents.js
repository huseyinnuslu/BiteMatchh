/**
 * seedEvents.js  (backend/scripts/)
 * BiteMatch – Kalıcı manuel etkinlik seed scripti
 * Çalıştırma: cd backend && node scripts/seedEvents.js
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const candidateSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    imageUrl:    { type: String, default: '' },
    category:    { type: String, required: true },
    budget:      String,
    description: String,
    location:    String,
    mapsQuery:   String,
    ticketUrl:   { type: String, default: null },
    isLiveEvent: { type: Boolean, default: false },
    eventDate:   { type: Date,   default: null },
    eventSource: { type: String, default: null },
    expireAt:    { type: Date,   default: null },
    externalId:  { type: String, default: null },
  },
  { timestamps: true }
);
candidateSchema.index({ expireAt:    1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ externalId:  1 }, { unique: true, sparse: true });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// Tarih yardımcısı: bugünden N gün sonrası
function daysFromNow(n, hour = 20) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function expireAfterEvent(eventDate, daysAfter = 10) {
  const d = new Date(eventDate);
  d.setDate(d.getDate() + daysAfter);
  return d;
}

// Sadece GERÇEK bilet sayfası URL'i döner; jenerik ana sayfa ise null döner
function safeTicketUrl(url, knownPatterns = []) {
  if (!url) return null;
  const genericHomes = [
    'https://www.passo.com.tr',
    'https://passo.com.tr',
    'https://www.biletix.com',
    'https://biletix.com',
    'https://www.biletinial.com',
    'https://biletinial.com',
  ];
  // Tam olarak jenerik ana sayfa ise null döndür
  const stripped = url.replace(/\/+$/, '');
  if (genericHomes.some(g => stripped === g || stripped === g.replace('https://', 'http://'))) return null;
  return url;
}

const EVENTS = [
  {
    externalId:  'manual_001',
    name:        'Anyma – ÆDEN Global Tour',
    description: 'Dünyaca ünlü DJ Anyma\'nın İstanbul konseri. Techno ve melodic house\'un buluşması.',
    imageUrl:    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺₺',
    location:    'Ataköy Marina Arena, İstanbul',
    mapsQuery:   'Ataköy Marina Arena İstanbul',
    ticketUrl:   null, // Spesifik bilet sayfası bilinmiyor
    isLiveEvent: true,
    eventSource: 'Passo',
    eventDate:   daysFromNow(3, 21),
    expireAt:    expireAfterEvent(daysFromNow(3, 21)),
  },
  {
    externalId:  'manual_002',
    name:        'İstanbul Jazz Festivali',
    description: 'İstanbul\'un en prestijli müzik etkinliği. Dünyaca ünlü caz sanatçıları sahnede.',
    imageUrl:    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺₺',
    location:    'Küçükçiftlik Park, İstanbul',
    mapsQuery:   'Küçükçiftlik Park İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Biletix',
    eventDate:   daysFromNow(5, 19),
    expireAt:    expireAfterEvent(daysFromNow(5, 19)),
  },
  {
    externalId:  'manual_003',
    name:        'Miniatürk – Tarihi Yarımada Turu',
    description: 'Türkiye\'nin önemli yapılarının minyatür modellerini içeren açık hava müzesi.',
    imageUrl:    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
    category:    'aktivite',
    budget:      '₺',
    location:    'Miniatürk, İmrahor Caddesi, İstanbul',
    mapsQuery:   'Miniatürk İstanbul',
    ticketUrl:   'https://www.miniaturk.com.tr/ziyaret/biletler',
    isLiveEvent: true,
    eventSource: 'IBB',
    eventDate:   daysFromNow(2, 10),
    expireAt:    expireAfterEvent(daysFromNow(2, 10)),
  },
  {
    externalId:  'manual_004',
    name:        'Galatasaray – Fenerbahçe Derbisi',
    description: 'Türkiye\'nin en büyük futbol derbisi. Ali Sami Yen\'de tarihi bir gece.',
    imageUrl:    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'NEF Stadyumu (Ali Sami Yen), İstanbul',
    mapsQuery:   'NEF Stadyumu Ali Sami Yen İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Passo',
    eventDate:   daysFromNow(7, 20),
    expireAt:    expireAfterEvent(daysFromNow(7, 20)),
  },
  {
    externalId:  'manual_005',
    name:        'Ayasofya Gece Müzesi Turu',
    description: 'Tarihi Ayasofya\'da gece ışık gösterisi eşliğinde özel rehberli tur deneyimi.',
    imageUrl:    'https://images.unsplash.com/photo-1589561253898-768105ca91a8?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'Ayasofya Camii, Sultanahmet, İstanbul',
    mapsQuery:   'Ayasofya Camii Sultanahmet İstanbul',
    ticketUrl:   'https://muze.gov.tr/muze-detay?SectionId=AYS01&DistId=AYS',
    isLiveEvent: true,
    eventSource: 'IBB',
    eventDate:   daysFromNow(4, 20),
    expireAt:    expireAfterEvent(daysFromNow(4, 20)),
  },
  {
    externalId:  'manual_006',
    name:        'Emre Aydın Akustik Konseri',
    description: 'Türk pop müziğinin sevilen ismi Emre Aydın\'dan özel akustik gece.',
    imageUrl:    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'Babylon İstanbul, Beşiktaş',
    mapsQuery:   'Babylon İstanbul Beşiktaş',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Biletix',
    eventDate:   daysFromNow(10, 21),
    expireAt:    expireAfterEvent(daysFromNow(10, 21)),
  },
  {
    externalId:  'manual_007',
    name:        'İstanbul Tiyatro Festivali',
    description: 'İstanbul\'un dört bir yanındaki sahnelerde dünyadan ve yerelden seçkin tiyatro oyunları.',
    imageUrl:    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'AKM – Atatürk Kültür Merkezi, İstanbul',
    mapsQuery:   'AKM Atatürk Kültür Merkezi İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Biletix',
    eventDate:   daysFromNow(6, 19),
    expireAt:    expireAfterEvent(daysFromNow(6, 19)),
  },
  {
    externalId:  'manual_008',
    name:        'Boğaz\'da Gün Batımı Yat Turu',
    description: 'İstanbul Boğazı\'nda özel yat ile gün batımı ve akşam yemeği turu.',
    imageUrl:    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺₺',
    location:    'Kabataş İskelesi, İstanbul',
    mapsQuery:   'Kabataş İskelesi İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'IBB',
    eventDate:   daysFromNow(1, 18),
    expireAt:    expireAfterEvent(daysFromNow(1, 18)),
  },
  {
    externalId:  'manual_009',
    name:        'Müzik Atölyesi – Elektronik Müzik Üretimi',
    description: 'Başlangıç seviyesi elektronik müzik üretim atölyesi. DAW ve synthesizer temelleri.',
    imageUrl:    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'Moda Sahnesi, Kadıköy, İstanbul',
    mapsQuery:   'Moda Sahnesi Kadıköy İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Eventbrite',
    eventDate:   daysFromNow(8, 14),
    expireAt:    expireAfterEvent(daysFromNow(8, 14)),
  },
  {
    externalId:  'manual_010',
    name:        'Stand-Up: Ata Demirer\'in Yeni Gösterisi',
    description: 'Türkiye\'nin en sevilen stand-up ustası Ata Demirer\'den yepyeni gösteri.',
    imageUrl:    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=85',
    category:    'aktivite',
    budget:      '₺₺',
    location:    'Zorlu PSM, Beşiktaş, İstanbul',
    mapsQuery:   'Zorlu PSM Beşiktaş İstanbul',
    ticketUrl:   null,
    isLiveEvent: true,
    eventSource: 'Biletix',
    eventDate:   daysFromNow(12, 20),
    expireAt:    expireAfterEvent(daysFromNow(12, 20)),
  },
];

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  // Eski canlı etkinlikleri temizle
  const { deletedCount } = await Candidate.deleteMany({ isLiveEvent: true });
  console.log(`🧹 ${deletedCount} eski etkinlik silindi.`);

  // Yeni etkinlikleri kaydet
  const saved = await Candidate.insertMany(EVENTS, { ordered: false });
  console.log(`✅ ${saved.length} etkinlik başarıyla veritabanına kaydedildi.\n`);

  EVENTS.forEach(e => {
    const ticket = e.ticketUrl ? '🎟' : '❌ bilet yok';
    console.log(`  📅 ${e.name} → ${e.eventDate.toLocaleDateString('tr-TR')} | ${ticket} | ${e.eventSource}`);
  });

  await mongoose.disconnect();
  console.log('\n✨ Seed tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
