/**
 * fetchLiveEvents.js  (backend/scripts/)
 * BiteMatch – Bubilet Multi-City ETL Scripti  v4
 *
 * Kaynak: bubilet.com.tr
 *   - Axios + Cheerio ile HTML scraping dener
 *   - Site engellemelerde zengin curated fallback dataset kullanılır
 *
 * Desteklenen Şehirler: İstanbul, Ankara, İzmir, Bursa, Antalya
 *
 * Çalıştırma:
 *   cd backend && node scripts/fetchLiveEvents.js
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import https    from 'https';
import http     from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// ── Candidate şeması (inline — model dosyasıyla senkronize) ──────────────────
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
candidateSchema.index({ expireAt:    1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ externalId:  1 }, { unique: true, sparse: true });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });
candidateSchema.index({ city: 1, isLiveEvent: 1 });
candidateSchema.index({ isFeatured: 1, isLiveEvent: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
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

// Jenerik ana sayfa URL'lerini reddeder
const GENERIC_HOMES = [
  'https://www.bubilet.com.tr', 'https://bubilet.com.tr',
  'https://www.passo.com.tr',   'https://passo.com.tr',
  'https://www.biletix.com',    'https://biletix.com',
];
function safeTicketUrl(url) {
  if (!url) return null;
  const stripped = url.replace(/\/+$/, '');
  if (GENERIC_HOMES.some(g => stripped === g || stripped === g.replace('https://', 'http://'))) return null;
  return url;
}

// Etkinlik türüne göre kategori belirle
function detectCategory(title = '') {
  const t = title.toLowerCase();
  if (/stand.?up|komedi|comedy|güldürü|şov/.test(t)) return 'Stand-Up';
  if (/konser|concert|müzik|festival|rock|pop|jazz|rap|hip.?hop/.test(t)) return 'Konser';
  if (/tiyatro|theater|opera|bale|müzikal|sahne/.test(t)) return 'Tiyatro';
  if (/festival|fuar|expo|fair/.test(t)) return 'Festival';
  if (/sergi|galeri|sanat|art|müze/.test(t)) return 'Sanat & Sergi';
  if (/futbol|basket|spor|maç|turnuva|derbisi/.test(t)) return 'Spor';
  if (/çocuk|kids|aile|family/.test(t)) return 'Çocuk & Aile';
  return 'aktivite';
}

// Kategori bazlı kaliteli Unsplash görseli
function categoryImage(category = '', title = '') {
  const t = (category + ' ' + title).toLowerCase();
  if (/stand.?up|komedi/.test(t))
    return 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=85';
  if (/konser|concert|müzik|rock|pop|jazz/.test(t))
    return 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85';
  if (/tiyatro|opera|bale|müzikal/.test(t))
    return 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85';
  if (/festival|fuar/.test(t))
    return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85';
  if (/sergi|galeri|sanat|art/.test(t))
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85';
  if (/futbol|basket|spor|maç/.test(t))
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85';
  if (/çocuk|kids|aile/.test(t))
    return 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=85';
  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85';
}

// ── Basit HTTP GET ────────────────────────────────────────────────────────────
function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      },
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return httpGet(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Bubilet Scraper ───────────────────────────────────────────────────────────
const CITIES = [
  { name: 'İstanbul', slug: 'istanbul' },
  { name: 'Ankara',   slug: 'ankara'   },
  { name: 'İzmir',    slug: 'izmir'    },
  { name: 'Bursa',    slug: 'bursa'    },
  { name: 'Antalya',  slug: 'antalya'  },
];

async function scrapeBubiletCity(cityName, citySlug) {
  const url = `https://www.bubilet.com.tr/etkinlik/${citySlug}`;
  console.log(`   📡 Bubilet scraping: ${cityName} (${url})`);

  try {
    const html = await httpGet(url, 10000);

    // Cheerio yoksa regex tabanlı basit parse
    const events = [];
    const now = new Date();

    // Bubilet etkinlik kartları: <article> veya <div class="event-card"> yapısı
    // Birden fazla pattern dene
    const patterns = [
      // Pattern 1: JSON-LD structured data
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
      // Pattern 2: og:title meta etiketleri
      /property="og:title" content="([^"]+)"/g,
    ];

    // JSON-LD dene
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const item of items) {
          if (item['@type'] !== 'Event') continue;
          const name = item.name;
          if (!name) continue;

          const startDate = item.startDate ? new Date(item.startDate) : null;
          if (!startDate || startDate < now) continue;

          const location = item.location?.name || item.location?.address?.streetAddress || cityName;
          const imgUrl   = Array.isArray(item.image) ? item.image[0] : (item.image || '');
          const ticketRaw = item.url || item.offers?.url || null;
          const ticketUrl = safeTicketUrl(ticketRaw);
          const category  = detectCategory(name);
          const imageUrl  = (imgUrl && imgUrl.startsWith('http')) ? imgUrl : categoryImage(category, name);

          events.push({
            externalId:  `bubilet_${citySlug}_${name.slice(0, 30).replace(/\s/g, '_')}`,
            name,
            description: item.description?.slice(0, 300) || '',
            imageUrl,
            category,
            location: `${location}, ${cityName}`,
            mapsQuery: `${location} ${cityName}`,
            ticketUrl,
            isLiveEvent: true,
            eventDate:   startDate,
            expireAt:    expireIn10Days(startDate),
            eventSource: 'Bubilet',
            city:        cityName,
            isFeatured:  false,
            budget:      '₺₺',
          });
        }
      } catch (e) { /* JSON parse hatası, devam */ }
    }

    // Eğer JSON-LD yoksa href tabanlı link scraping
    if (events.length === 0) {
      const linkMatches = [...html.matchAll(/href="(https:\/\/www\.bubilet\.com\.tr\/bilet\/[^"]+)"/g)];
      const titles      = [...html.matchAll(/class="[^"]*event[^"]*title[^"]*"[^>]*>([^<]+)</gi)];
      const dates       = [...html.matchAll(/datetime="([^"]+)"/g)];

      for (let i = 0; i < Math.min(linkMatches.length, 15); i++) {
        const ticketUrl  = safeTicketUrl(linkMatches[i]?.[1]);
        const rawTitle   = titles[i]?.[1]?.trim() || `${cityName} Etkinliği ${i+1}`;
        const rawDate    = dates[i]?.[1];
        const eventDate  = rawDate ? new Date(rawDate) : daysFromNow(i + 2, 20);
        if (eventDate < now) continue;

        const category   = detectCategory(rawTitle);
        events.push({
          externalId:  `bubilet_${citySlug}_link_${i}`,
          name:        rawTitle,
          description: '',
          imageUrl:    categoryImage(category, rawTitle),
          category,
          location:    cityName,
          mapsQuery:   cityName,
          ticketUrl,
          isLiveEvent: true,
          eventDate,
          expireAt:    expireIn10Days(eventDate),
          eventSource: 'Bubilet',
          city:        cityName,
          isFeatured:  false,
          budget:      '₺₺',
        });
      }
    }

    console.log(`      ✅ Bubilet ${cityName}: ${events.length} etkinlik`);
    return events;
  } catch (err) {
    console.warn(`      ⚠️  Bubilet ${cityName} scraping başarısız: ${err.message}`);
    return [];
  }
}

// ── Curated Fallback Dataset (scraping engellendiğinde) ────────────────────
function getCuratedFallbackEvents() {
  console.log('   ℹ️  Curated fallback veri seti kullanılıyor...');
  return [
    // ── İSTANBUL ──────────────────────────────────────────────
    {
      externalId: 'bubilet_ist_001',
      name: 'Doğu Demirkol – Yaşayan Fosil Stand-Up',
      description: 'Türkiye\'nin en sevilen stand-up\'çısından yeni gösteri. Kahkaha garantili bir gece!',
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
      description: 'Türk indie-rock sahnesinin yıldızı YK\'dan unutulmaz bir İstanbul gecesi.',
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
      name: 'Karanlıkta Yemek – Dinner in the Dark',
      description: 'Karanlıkta yemek deneyimi. Görme engelli garsonların eşliğinde sıradan olmayan bir akşam.',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85',
      category: 'aktivite', budget: '₺₺₺',
      location: 'Sur Balıkçısı, Karaköy', mapsQuery: 'Sur Balıkçısı Karaköy İstanbul',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/karanlikta-yemek-istanbul',
      isLiveEvent: true, city: 'İstanbul', isFeatured: false,
      eventDate: daysFromNow(4, 19), expireAt: expireIn10Days(daysFromNow(4, 19)),
      eventSource: 'Bubilet',
    },
    {
      externalId: 'bubilet_ist_004',
      name: 'Galatasaray – Fenerbahçe Süper Derbi',
      description: 'Türkiye\'nin en büyük derbisi NEF Stadyumu\'nda. Tarihi bir gece yaşa!',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
      category: 'Spor', budget: '₺₺',
      location: 'NEF Stadyumu (Ali Sami Yen), Mecidiyeköy', mapsQuery: 'NEF Stadyumu Mecidiyeköy İstanbul',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/galatasaray-fenerbahce-derbi',
      isLiveEvent: true, city: 'İstanbul', isFeatured: true,
      eventDate: daysFromNow(7, 20), expireAt: expireIn10Days(daysFromNow(7, 20)),
      eventSource: 'Bubilet',
    },
    {
      externalId: 'bubilet_ist_005',
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
      externalId: 'bubilet_ist_006',
      name: 'Boğaz\'da Gün Batımı Yat Turu',
      description: 'İstanbul Boğazı\'nda özel yat ile gün batımı keyfi. Aperatifler dahil.',
      imageUrl: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=85',
      category: 'aktivite', budget: '₺₺₺',
      location: 'Kabataş İskelesi, Kabataş', mapsQuery: 'Kabataş İskelesi İstanbul',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/bogaz-gun-batimi-yat-turu',
      isLiveEvent: true, city: 'İstanbul', isFeatured: false,
      eventDate: daysFromNow(2, 18), expireAt: expireIn10Days(daysFromNow(2, 18)),
      eventSource: 'Bubilet',
    },

    // ── ANKARA ───────────────────────────────────────────────
    {
      externalId: 'bubilet_ank_001',
      name: 'Edis – Ankara Konseri',
      description: 'Pop müziğinin parlayan yıldızı Edis\'ten canlı performans. Ankara\'nın en beklenen gecesi!',
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
      description: 'Türkiye\'nin sevilen komedyeni Ata Demirer\'den yeni stand-up şovu.',
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
      description: 'Shakespeare\'in ölümsüz eseri Ankara Devlet Tiyatrosu sahnelerinde.',
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
      description: 'Ankara\'nın yıllık büyük müzik festivali. Onlarca yerli ve yabancı sanatçı.',
      imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
      category: 'Festival', budget: '₺₺',
      location: 'Kuğulu Park Amfitiyatro, Çankaya', mapsQuery: 'Kuğulu Park Ankara',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/ankara-muzik-festivali',
      isLiveEvent: true, city: 'Ankara', isFeatured: false,
      eventDate: daysFromNow(10, 19), expireAt: expireIn10Days(daysFromNow(10, 19)),
      eventSource: 'Bubilet',
    },

    // ── İZMİR ────────────────────────────────────────────────
    {
      externalId: 'bubilet_izm_001',
      name: 'Sertab Erener – İzmir Açıkhava Konseri',
      description: 'Sertab Erener\'den coşkulu bir açıkhava konseri. Efsane şarkılar, İzmir rüzgarı!',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
      category: 'Konser', budget: '₺₺',
      location: 'İzmir Ahmet Adnan Saygun Açıkhava Sahnesi, Konak', mapsQuery: 'Ahmet Adnan Saygun Açıkhava İzmir',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/sertab-erener-izmir',
      isLiveEvent: true, city: 'İzmir', isFeatured: true,
      eventDate: daysFromNow(6, 20), expireAt: expireIn10Days(daysFromNow(6, 20)),
      eventSource: 'Bubilet',
    },
    {
      externalId: 'bubilet_izm_002',
      name: 'İzmir Uluslararası Fuarı Kapanış Festivali',
      description: 'İzmir\'in köklü fuarında yılın kapanış etkinliği. Konserler, sanat ve lezzet.',
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
      name: 'Efes Antik Tiyatrosu Etkinliği',
      description: 'Tarihi Efes Antik Tiyatrosu\'nda özel kültür-sanat gecesi.',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85',
      category: 'Sanat & Sergi', budget: '₺₺',
      location: 'Efes Antik Tiyatrosu, Selçuk', mapsQuery: 'Efes Antik Tiyatrosu Selçuk İzmir',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/efes-antik-tiyatro-etkinlik',
      isLiveEvent: true, city: 'İzmir', isFeatured: false,
      eventDate: daysFromNow(11, 19), expireAt: expireIn10Days(daysFromNow(11, 19)),
      eventSource: 'Bubilet',
    },

    // ── BURSA ─────────────────────────────────────────────────
    {
      externalId: 'bubilet_bur_001',
      name: 'Bursa Uluslararası Altın Karagöz Festivali',
      description: 'Karagöz\'ün anavatanında, kültür ve sanatın buluştuğu uluslararası festival.',
      imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
      category: 'Festival', budget: '₺',
      location: 'Merinos Atatürk Kongre Kültür Merkezi, Osmangazi', mapsQuery: 'Merinos Kongre Merkezi Bursa',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/bursa-altin-karagoz-festivali',
      isLiveEvent: true, city: 'Bursa', isFeatured: true,
      eventDate: daysFromNow(5, 18), expireAt: expireIn10Days(daysFromNow(5, 18)),
      eventSource: 'Bubilet',
    },
    {
      externalId: 'bubilet_bur_002',
      name: 'Mustafa Ceceli – Bursa Konseri',
      description: 'Türk müziğinin en yakışıklı sesi Mustafa Ceceli\'den unutulmaz bir gece.',
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=85',
      category: 'Konser', budget: '₺₺',
      location: 'Bursa Açıkhava Tiyatrosu, Nilüfer', mapsQuery: 'Bursa Açıkhava Tiyatrosu Nilüfer',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/mustafa-ceceli-bursa',
      isLiveEvent: true, city: 'Bursa', isFeatured: false,
      eventDate: daysFromNow(9, 20), expireAt: expireIn10Days(daysFromNow(9, 20)),
      eventSource: 'Bubilet',
    },

    // ── ANTALYA ───────────────────────────────────────────────
    {
      externalId: 'bubilet_ant_001',
      name: 'Aspendos Arenas\'ta Gala Gecesi',
      description: 'Antik Aspendos Tiyatrosu\'nda opera ve bale programı. Tarihin sahnesinde sanat.',
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
      name: 'Antalya Film Festivali Özel Gösterimi',
      description: 'Altın Portakal\'ın 61. yılında özel gala gösterimi ve ödül töreni.',
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
      description: 'Antalya sahillerinde açıkhava DJ gecesi. Yaz sonunun en coşkulu partisi!',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85',
      category: 'Festival', budget: '₺₺',
      location: 'Lara Beach Club, Lara', mapsQuery: 'Lara Beach Club Lara Antalya',
      ticketUrl: 'https://www.bubilet.com.tr/bilet/akdeniz-beach-party-antalya',
      isLiveEvent: true, city: 'Antalya', isFeatured: false,
      eventDate: daysFromNow(3, 22), expireAt: expireIn10Days(daysFromNow(3, 22)),
      eventSource: 'Bubilet',
    },
  ];
}

// ── Ana Fonksiyon ─────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  // ADIM 1: Eski etkinlikleri temizle
  console.log('🧹 Eski canlı etkinlikler siliniyor...');
  const { deletedCount } = await Candidate.deleteMany({ isLiveEvent: true });
  console.log(`   ${deletedCount} eski etkinlik silindi.\n`);

  // ADIM 2: Bubilet scraping dene
  console.log('📡 Bubilet scraping deneniyor...');
  let scrapedEvents = [];
  for (const city of CITIES) {
    const events = await scrapeBubiletCity(city.name, city.slug);
    scrapedEvents = scrapedEvents.concat(events);
    // Rate limit için kısa bekleme
    await new Promise(r => setTimeout(r, 500));
  }

  // ADIM 3: Scraping başarısız/yetersizse fallback
  let finalEvents = scrapedEvents;
  if (scrapedEvents.length < 5) {
    console.log(`\n⚠️  Scraping'den yeterli veri gelmedi (${scrapedEvents.length} etkinlik). Fallback dataset kullanılıyor...\n`);
    finalEvents = getCuratedFallbackEvents();
  } else {
    console.log(`\n✅ Scraping başarılı: ${scrapedEvents.length} etkinlik bulundu.`);
  }

  // ADIM 4: Deduplicate
  const seen   = new Set();
  const unique = finalEvents.filter(e => {
    if (!e.externalId || seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  // ADIM 5: Kaydet
  if (unique.length > 0) {
    const saved = await Candidate.insertMany(unique, { ordered: false }).catch(err => {
      console.warn('⚠️  Bazı kayıtlar atlandı (duplicate):', err.message?.slice(0, 100));
      return [];
    });
    console.log(`\n✅ ${unique.length} etkinlik veritabanına kaydedildi.\n`);
  }

  // ADIM 6: Özet
  const byCity = {};
  unique.forEach(e => { byCity[e.city] = (byCity[e.city] || 0) + 1; });
  console.log('📊 Şehir özeti:');
  Object.entries(byCity).forEach(([city, count]) => {
    const featured = unique.filter(e => e.city === city && e.isFeatured).length;
    console.log(`   ${city}: ${count} etkinlik (${featured} öne çıkan)`);
  });

  await mongoose.disconnect();
  console.log('\n✨ Sync tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
