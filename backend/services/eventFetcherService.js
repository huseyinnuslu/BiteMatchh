/**
 * eventFetcherService.js
 * BiteMatch – Canlı Etkinlik Çekme Servisi
 *
 * Gerçek hayatta Biletix / Passo API'lerine bağlanır.
 * Şu an: İstanbul etkinliklerini simüle eden zengin mock veri + günlük cron job.
 *
 * Akış:
 *   1. Cron her gece 02:00'da tetiklenir
 *   2. Mock verilerden (veya gerçek API'den) etkinlikler çekilir
 *   3. Veritabanında olmayan etkinlikler isLiveEvent:true ile eklenir
 *   4. Tarihi geçmiş etkinlikler temizlenir (TTL index ile de otomatik silinir)
 */

import cron from 'node-cron';
import Candidate from '../models/Candidate.js';

const fallbackEventId = (name) => `fallback_${name
  .toLocaleLowerCase('tr-TR')
  .replace(/[^a-z0-9çğıöşü]+/g, '_')
  .replace(/^_+|_+$/g, '')}`;

// ── İstanbul Etkinlik Mock Veri Havuzu ──────────────────────────────────────
// Gerçek entegrasyonda bu veriler Biletix/Passo API yanıtından parse edilir.

const generateMockEvents = () => {
  const now = new Date();

  // Yardımcı: şu andan N gün + saat sonrasını döner
  const future = (days, hours = 20) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    return d;
  };

  // expireAt: etkinlik bitişinden 2 saat sonra kart silinsin
  const expireAfter = (eventDate, durationHours = 3) => {
    const d = new Date(eventDate);
    d.setHours(d.getHours() + durationHours + 2);
    return d;
  };

  const events = [
    // ── Konserler ────────────────────────────────────────────────────────
    {
      name: 'Sertab Erener — İstanbul Konseri',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80',
      category: 'aktivite',
      description: 'Türk pop müziğinin kraliçesi Sertab Erener, İstanbul\'da muhteşem bir gece için sahnede!',
      location: 'Volkswagen Arena, Maslak',
      budget: '₺₺₺',
      eventDate: future(2, 20),
      eventSource: 'Biletix',
    },
    {
      name: 'Duman — Akustik Gece',
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
      category: 'aktivite',
      description: 'Duman\'ın efsane şarkıları bu sefer akustik aranjmanlarla Harbiye\'de.',
      location: 'Açıkhava Tiyatrosu, Harbiye',
      budget: '₺₺',
      eventDate: future(3, 21),
      eventSource: 'Biletix',
    },
    {
      name: 'DJ Night — Fabric Istanbul',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
      category: 'aktivite',
      description: 'Dünyanın en iyi DJ\'lerinden biri İstanbul\'a geliyor. Sabaha kadar dans!',
      location: 'Fabric Club, Beşiktaş',
      budget: '₺₺',
      eventDate: future(1, 23),
      eventSource: 'Passo',
    },

    // ── Tiyatro ──────────────────────────────────────────────────────────
    {
      name: 'Hamlet — Shakespeare Klasiği',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
      category: 'aktivite',
      description: 'Devlet Tiyatroları\'nın ödüllü Hamlet yorumu. Olmak ya da olmamak...',
      location: 'Devlet Tiyatrosu, Kadıköy',
      budget: '₺',
      eventDate: future(4, 19),
      eventSource: 'Manual',
    },
    {
      name: 'Komedi Gecesi — Solo Sahne',
      imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80',
      category: 'aktivite',
      description: 'Türkiye\'nin en sevilen komedyen kadrosu tek sahnede buluşuyor.',
      location: 'Zorlu PSM, Levent',
      budget: '₺₺',
      eventDate: future(5, 20),
      eventSource: 'Passo',
    },

    // ── Stand-Up ─────────────────────────────────────────────────────────
    {
      name: 'Stand-Up İstanbul — Ahmet Güven',
      imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&q=80',
      category: 'aktivite',
      description: 'Güncel siyaset, sosyal medya ve gündelik hayat gözlemcisi Ahmet Güven sahnede.',
      location: 'Babylon, Bomonti',
      budget: '₺₺',
      eventDate: future(2, 21),
      eventSource: 'Biletix',
    },
    {
      name: 'Open Mic Stand-Up Gecesi',
      imageUrl: 'https://images.unsplash.com/photo-1516307365-f2e5bfa3975c?w=600&q=80',
      category: 'aktivite',
      description: 'Yeni yetenekler ve sürpriz konuk komedyenler. Gülmeye hazır mısınız?',
      location: 'Salon IKSV, Şişhane',
      budget: '₺',
      eventDate: future(6, 20),
      eventSource: 'Manual',
    },

    // ── Spor Maçları ──────────────────────────────────────────────────────
    {
      name: 'Galatasaray — Fenerbahçe Derbisi',
      imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80',
      category: 'aktivite',
      description: 'Türkiye\'nin en büyük futbol derbisi. Nefes kesen 90 dakika!',
      location: 'NEF Stadyumu, Seyrantepe',
      budget: '₺₺₺',
      eventDate: future(7, 19),
      eventSource: 'Passo',
    },
    {
      name: 'Efes Pilsen — EuroLeague Basketbol',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
      category: 'aktivite',
      description: 'Anadolu Efes, EuroLeague\'de kritik bir maç için parke üzerinde.',
      location: 'Sinan Erdem Spor Salonu, Bakırköy',
      budget: '₺₺',
      eventDate: future(3, 18),
      eventSource: 'Biletix',
    },

    // ── Sergi / Kültür ────────────────────────────────────────────────────
    {
      name: 'Monet\'den Kahire\'ye — Empresyonizm Sergisi',
      imageUrl: 'https://images.unsplash.com/photo-1578926288207-32357be5fbb7?w=600&q=80',
      category: 'aktivite',
      description: 'Dünya müzelerinden gelen orijinal eserlerle empresyonizmin altın çağı.',
      location: 'İstanbul Modern, Karaköy',
      budget: '₺₺',
      eventDate: future(0, 10),   // bugün
      eventSource: 'Manual',
      duration: '4 saat',
    },
  ];

  // Her etkinliğe TTL süresini hesapla
  return events.map(ev => ({
    ...ev,
    isLiveEvent: true,
    expireAt: expireAfter(ev.eventDate, ev.duration ? 4 : 3),
  }));
};

// ── Veritabanına Kaydet ─────────────────────────────────────────────────────
/**
 * Etkinlik havuzunu günceller.
 * Sabit dış kimlik sayesinde her günlük çalışmada aynı kartlar çoğalmaz.
 */
export const fetchAndStoreEvents = async () => {
  // Gerçek etkinlik havuzu GitHub Actions üzerinden güncellenir. Eski mock
  // akışı yalnızca yerel demo gerektiğinde açıkça etkinleştirilir.
  if (process.env.ENABLE_MOCK_EVENTS !== 'true') {
    console.log('ℹ️ Mock etkinlik üretimi kapalı; gerçek etkinlik sync bekleniyor.');
    return { created: 0, refreshed: 0 };
  }

  try {
    const events = generateMockEvents();
    const now = new Date();

    let created = 0;
    let refreshed = 0;

    for (const ev of events) {
      // Tarihi geçmiş etkinlikleri ekleme
      if (ev.eventDate < now) {
        continue;
      }

      // Tarih her yenilemede göreceli hesaplanır. Sabit kimlikle upsert yapmak,
      // aynı kartın her gün yeniden eklenmesini engeller ve tarihini güncel tutar.
      const externalId = fallbackEventId(ev.name);
      const result = await Candidate.updateOne(
        { externalId },
        { $set: { ...ev, externalId } },
        { upsert: true }
      );
      if (result.upsertedCount) created++;
      else refreshed++;
    }

    console.log(`📅 Canlı etkinlikler güncellendi: ${created} yeni, ${refreshed} yenilendi`);
    return { created, refreshed };
  } catch (error) {
    console.error('❌ Canlı etkinlik çekme hatası:', error.message);
  }
};

// ── Süresi Geçmiş Etkinlikleri Temizle ─────────────────────────────────────
// TTL index otomatik halleder, ama manuel tetikleme de mevcut
export const cleanExpiredEvents = async () => {
  const result = await Candidate.deleteMany({
    isLiveEvent: true,
    expireAt: { $lt: new Date() },
  });
  if (result.deletedCount > 0) {
    console.log(`🧹 ${result.deletedCount} süresi geçmiş etkinlik temizlendi`);
  }
};

// ── Cron Job Başlatıcı ──────────────────────────────────────────────────────
/**
 * Her gece 02:00'da otomatik çalışır.
 * Server başladığında da bir kez çalıştırılır (fresh data için).
 */
export const startEventCron = () => {
  // Günlük 02:00'da çalış
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [Cron] Canlı etkinlik güncelleme başladı...');
    await fetchAndStoreEvents();
    await cleanExpiredEvents();
  }, {
    timezone: 'Europe/Istanbul',
  });

  // Server başlangıcında bir kez çalıştır
  console.log('🚀 Canlı etkinlik servisi başlatıldı (günlük 02:00, Europe/Istanbul)');
  fetchAndStoreEvents();
};
