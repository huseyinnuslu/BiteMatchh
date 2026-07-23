/**
 * seedEvents.js  (backend/scripts/)
 * BiteMatch – Bubilet tarzı çoklu şehir seed scripti
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
    city:        { type: String, default: null },
    isFeatured:  { type: Boolean, default: false },
    expireAt:    { type: Date,   default: null },
    externalId:  { type: String, default: null },
  },
  { timestamps: true }
);
candidateSchema.index({ expireAt:   1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ externalId: 1 }, { unique: true, sparse: true });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });
candidateSchema.index({ city: 1, isLiveEvent: 1 });
candidateSchema.index({ isFeatured: 1, isLiveEvent: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

function daysFromNow(n, hour = 20) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function expireIn10Days(eventDate) {
  const d = new Date(eventDate);
  d.setDate(d.getDate() + 10);
  return d;
}

const EVENTS = [
  // ── İSTANBUL ──────────────────────────────────────────────────────────────
  {
    externalId: 'bubilet_ist_001',
    name: 'Doğu Demirkol – Yaşayan Fosil Stand-Up',
    description: 'Türkiye\'nin en sevilen stand-up\'çısından yeni gösteri. Kahkaha garantili!',
    imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=85',
    category: 'Stand-Up', budget: '₺₺',
    location: 'Zorlu PSM, Beşiktaş', mapsQuery: 'Zorlu PSM Beşiktaş İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/dogu-demirkol-yasayan-fosil',
    isLiveEvent: true, city: 'İstanbul', isFeatured: true,
    eventDate: daysFromNow(3, 21), expireAt: expireIn10Days(daysFromNow(3, 21)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ist_002',
    name: 'Yüzyüzeyken Konuşuruz Konseri',
    description: 'Türk indie-rock sahnesinin yıldızından unutulmaz İstanbul gecesi.',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
    category: 'Konser', budget: '₺₺',
    location: 'KüçükÇiftlik Park, Maslak', mapsQuery: 'KüçükÇiftlik Park Maslak İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/yuzyuzeyken-konusuruz-istanbul',
    isLiveEvent: true, city: 'İstanbul', isFeatured: true,
    eventDate: daysFromNow(5, 20), expireAt: expireIn10Days(daysFromNow(5, 20)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ist_003',
    name: 'Galatasaray – Fenerbahçe Süper Derbi',
    description: 'Türkiye\'nin en büyük derbisi NEF Stadyumu\'nda!',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
    category: 'Spor', budget: '₺₺',
    location: 'NEF Stadyumu, Mecidiyeköy', mapsQuery: 'NEF Stadyumu Mecidiyeköy İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/galatasaray-fenerbahce-derbi',
    isLiveEvent: true, city: 'İstanbul', isFeatured: true,
    eventDate: daysFromNow(7, 20), expireAt: expireIn10Days(daysFromNow(7, 20)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ist_004',
    name: 'Müzeyyen Senar Müzikal – Bir Ömür Böyle Geçti',
    description: 'Türk müziğinin efsane ismine ithafen hazırlanan muhteşem müzikal.',
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
    category: 'Tiyatro', budget: '₺₺',
    location: 'Kenter Tiyatrosu, Şişli', mapsQuery: 'Kenter Tiyatrosu Şişli İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/muzeyyen-senar-muzikal',
    isLiveEvent: true, city: 'İstanbul', isFeatured: false,
    eventDate: daysFromNow(9, 20), expireAt: expireIn10Days(daysFromNow(9, 20)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ist_005',
    name: 'Boğaz\'da Gün Batımı Yat Turu',
    description: 'İstanbul Boğazı\'nda özel yat ile gün batımı keyfi. Aperatifler dahil.',
    imageUrl: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=85',
    category: 'aktivite', budget: '₺₺₺',
    location: 'Kabataş İskelesi', mapsQuery: 'Kabataş İskelesi İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/bogaz-gun-batimi-yat-turu',
    isLiveEvent: true, city: 'İstanbul', isFeatured: false,
    eventDate: daysFromNow(2, 18), expireAt: expireIn10Days(daysFromNow(2, 18)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ist_006',
    name: 'Karanlıkta Yemek – Dinner in the Dark',
    description: 'Görme engelli garsonların eşliğinde karanlıkta özel yemek deneyimi.',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85',
    category: 'aktivite', budget: '₺₺₺',
    location: 'Sur Balıkçısı, Karaköy', mapsQuery: 'Sur Balıkçısı Karaköy İstanbul',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/karanlikta-yemek-istanbul',
    isLiveEvent: true, city: 'İstanbul', isFeatured: false,
    eventDate: daysFromNow(4, 19), expireAt: expireIn10Days(daysFromNow(4, 19)),
    eventSource: 'Bubilet',
  },

  // ── ANKARA ─────────────────────────────────────────────────────────────────
  {
    externalId: 'bubilet_ank_001',
    name: 'Edis – Ankara Konseri',
    description: 'Pop müziğinin parlayan yıldızı Edis\'ten canlı performans.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=85',
    category: 'Konser', budget: '₺₺',
    location: 'Joliet Joker Ankara, Çankaya', mapsQuery: 'Joliet Joker Ankara Çankaya',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/edis-ankara-konseri',
    isLiveEvent: true, city: 'Ankara', isFeatured: true,
    eventDate: daysFromNow(4, 21), expireAt: expireIn10Days(daysFromNow(4, 21)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ank_002',
    name: 'Ata Demirer – Güldürana Stand-Up',
    description: 'Türkiye\'nin sevilen komedyeninden yeni stand-up şovu.',
    imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=85',
    category: 'Stand-Up', budget: '₺₺',
    location: 'Congresium Ankara, Eskişehir Yolu', mapsQuery: 'Congresium Ankara Eskişehir Yolu',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/ata-demirer-ankara',
    isLiveEvent: true, city: 'Ankara', isFeatured: true,
    eventDate: daysFromNow(6, 20), expireAt: expireIn10Days(daysFromNow(6, 20)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ank_003',
    name: 'Ankara Devlet Tiyatrosu – Hamlet',
    description: 'Shakespeare\'in ölümsüz eseri AŞT sahnelerinde.',
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
    category: 'Tiyatro', budget: '₺',
    location: 'AŞT Büyük Sahne, Ulus', mapsQuery: 'AŞT Büyük Sahne Ulus Ankara',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/devlet-tiyatrosu-hamlet-ankara',
    isLiveEvent: true, city: 'Ankara', isFeatured: false,
    eventDate: daysFromNow(5, 19), expireAt: expireIn10Days(daysFromNow(5, 19)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ank_004',
    name: 'Ankara Müzik Festivali – Açılış Konseri',
    description: 'Onlarca yerli ve yabancı sanatçıyla yılın büyük festivali.',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
    category: 'Festival', budget: '₺₺',
    location: 'Kuğulu Park Amfitiyatro, Çankaya', mapsQuery: 'Kuğulu Park Ankara',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/ankara-muzik-festivali',
    isLiveEvent: true, city: 'Ankara', isFeatured: false,
    eventDate: daysFromNow(10, 19), expireAt: expireIn10Days(daysFromNow(10, 19)),
    eventSource: 'Bubilet',
  },

  // ── İZMİR ──────────────────────────────────────────────────────────────────
  {
    externalId: 'bubilet_izm_001',
    name: 'Sertab Erener – İzmir Açıkhava Konseri',
    description: 'Efsane şarkılar, İzmir rüzgarı eşliğinde unutulmaz bir gece!',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
    category: 'Konser', budget: '₺₺',
    location: 'Ahmet Adnan Saygun Açıkhava Sahnesi, Konak', mapsQuery: 'Ahmet Adnan Saygun Açıkhava İzmir',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/sertab-erener-izmir',
    isLiveEvent: true, city: 'İzmir', isFeatured: true,
    eventDate: daysFromNow(6, 20), expireAt: expireIn10Days(daysFromNow(6, 20)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_izm_002',
    name: 'İzmir Uluslararası Fuarı Kapanış Festivali',
    description: 'Konserler, sanat, lezzet ve çok daha fazlası bir arada.',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
    category: 'Festival', budget: '₺',
    location: 'İzmir Kültürpark, Konak', mapsQuery: 'İzmir Kültürpark Konak',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/izmir-fuari-kapalis-festival',
    isLiveEvent: true, city: 'İzmir', isFeatured: true,
    eventDate: daysFromNow(8, 17), expireAt: expireIn10Days(daysFromNow(8, 17)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_izm_003',
    name: 'Efes Antik Tiyatrosu – Kültür Gecesi',
    description: 'Tarihi Efes Antik Tiyatrosu\'nda özel kültür-sanat gecesi.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85',
    category: 'Sanat & Sergi', budget: '₺₺',
    location: 'Efes Antik Tiyatrosu, Selçuk', mapsQuery: 'Efes Antik Tiyatrosu Selçuk İzmir',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/efes-antik-tiyatro-etkinlik',
    isLiveEvent: true, city: 'İzmir', isFeatured: false,
    eventDate: daysFromNow(11, 19), expireAt: expireIn10Days(daysFromNow(11, 19)),
    eventSource: 'Bubilet',
  },

  // ── BURSA ───────────────────────────────────────────────────────────────────
  {
    externalId: 'bubilet_bur_001',
    name: 'Bursa Uluslararası Altın Karagöz Festivali',
    description: 'Karagöz\'ün anavatanında kültür ve sanatın buluştuğu festival.',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
    category: 'Festival', budget: '₺',
    location: 'Merinos Kongre Kültür Merkezi, Osmangazi', mapsQuery: 'Merinos Kongre Merkezi Bursa',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/bursa-altin-karagoz-festivali',
    isLiveEvent: true, city: 'Bursa', isFeatured: true,
    eventDate: daysFromNow(5, 18), expireAt: expireIn10Days(daysFromNow(5, 18)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_bur_002',
    name: 'Mustafa Ceceli – Bursa Konseri',
    description: 'Türk müziğinin en yakışıklı sesinden unutulmaz bir gece.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=85',
    category: 'Konser', budget: '₺₺',
    location: 'Bursa Açıkhava Tiyatrosu, Nilüfer', mapsQuery: 'Bursa Açıkhava Tiyatrosu Nilüfer',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/mustafa-ceceli-bursa',
    isLiveEvent: true, city: 'Bursa', isFeatured: false,
    eventDate: daysFromNow(9, 20), expireAt: expireIn10Days(daysFromNow(9, 20)),
    eventSource: 'Bubilet',
  },

  // ── ANTALYA ─────────────────────────────────────────────────────────────────
  {
    externalId: 'bubilet_ant_001',
    name: 'Aspendos Antik Tiyatrosu – Gala Gecesi',
    description: 'Antik Aspendos Tiyatrosu\'nda opera ve bale. Tarihin sahnesinde sanat!',
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
    category: 'Tiyatro', budget: '₺₺₺',
    location: 'Aspendos Antik Tiyatrosu, Serik', mapsQuery: 'Aspendos Antik Tiyatrosu Serik Antalya',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/aspendos-gala-gecesi',
    isLiveEvent: true, city: 'Antalya', isFeatured: true,
    eventDate: daysFromNow(7, 21), expireAt: expireIn10Days(daysFromNow(7, 21)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ant_002',
    name: 'Antalya Film Festivali – Altın Portakal',
    description: 'Altın Portakal\'ın özel gala gösterimi ve ödül töreni.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=85',
    category: 'Sanat & Sergi', budget: '₺₺',
    location: 'Antalya Kültür Merkezi, Muratpaşa', mapsQuery: 'Antalya Kültür Merkezi Muratpaşa',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/antalya-film-festivali',
    isLiveEvent: true, city: 'Antalya', isFeatured: true,
    eventDate: daysFromNow(12, 19), expireAt: expireIn10Days(daysFromNow(12, 19)),
    eventSource: 'Bubilet',
  },
  {
    externalId: 'bubilet_ant_003',
    name: 'Akdeniz Beach Party – DJ Gecesi',
    description: 'Antalya sahilinde açıkhava DJ gecesi. Yaz sonunun en coşkulu partisi!',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85',
    category: 'Festival', budget: '₺₺',
    location: 'Lara Beach Club, Lara', mapsQuery: 'Lara Beach Club Lara Antalya',
    ticketUrl: 'https://www.bubilet.com.tr/bilet/akdeniz-beach-party-antalya',
    isLiveEvent: true, city: 'Antalya', isFeatured: false,
    eventDate: daysFromNow(3, 22), expireAt: expireIn10Days(daysFromNow(3, 22)),
    eventSource: 'Bubilet',
  },
];

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  const { deletedCount } = await Candidate.deleteMany({ isLiveEvent: true });
  console.log(`🧹 ${deletedCount} eski etkinlik silindi.`);

  const saved = await Candidate.insertMany(EVENTS, { ordered: false });
  console.log(`✅ ${saved.length} etkinlik başarıyla veritabanına kaydedildi.\n`);

  // Şehir özeti
  const byCity = {};
  EVENTS.forEach(e => { byCity[e.city] = (byCity[e.city] || 0) + 1; });
  console.log('📊 Şehir özeti:');
  Object.entries(byCity).forEach(([city, count]) => {
    const featured = EVENTS.filter(e => e.city === city && e.isFeatured).length;
    const ticket   = EVENTS.filter(e => e.city === city && e.ticketUrl).length;
    console.log(`   ${city}: ${count} etkinlik | ${featured} öne çıkan | ${ticket} biletli`);
  });

  await mongoose.disconnect();
  console.log('\n✨ Seed tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
