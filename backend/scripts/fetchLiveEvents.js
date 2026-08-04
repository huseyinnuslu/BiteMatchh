/**
 * fetchLiveEvents.js  (backend/scripts/)
 * BiteMatch – Bubilet Multi-City Scraper  v5
 *
 * Kaynak: bubilet.com.tr
 * - Gerçek tarayıcı header'ları ile anti-bot bypass
 * - Scraping başarısızsa: SAHTE VERİ EKLENMEZ, loglanır ve çıkılır
 *
 * Desteklenen Şehirler: İstanbul, Ankara, İzmir, Bursa, Antalya
 * Çalıştırma: cd backend && node scripts/fetchLiveEvents.js
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

// ── Candidate şeması (inline) ─────────────────────────────────────────────────
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
candidateSchema.index({ city:        1, isLiveEvent: 1 });
candidateSchema.index({ isFeatured:  1, isLiveEvent: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ── Yardımcı ─────────────────────────────────────────────────────────────────
function expireIn10Days(eventDate) {
  const d = new Date(eventDate);
  d.setDate(d.getDate() + 10);
  return d;
}

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

function bubiletExternalId(citySlug, name, startDate, ticketUrl) {
  const stableValue = ticketUrl || `${name}|${startDate.toISOString()}`;
  return `bubilet_${citySlug}_${Buffer.from(stableValue).toString('base64url').slice(0, 96)}`;
}

function detectCategory(title = '') {
  const t = title.toLowerCase();
  if (/stand.?up|komedi|comedy|güldürü|şov/.test(t))                 return 'Stand-Up';
  if (/konser|concert|müzik|festival|rock|pop|jazz|rap|hip.?hop/.test(t)) return 'Konser';
  if (/tiyatro|theater|opera|bale|müzikal|sahne/.test(t))            return 'Tiyatro';
  if (/festival|fuar|expo|fair/.test(t))                             return 'Festival';
  if (/sergi|galeri|sanat|art|müze/.test(t))                         return 'Sanat & Sergi';
  if (/futbol|basket|spor|maç|turnuva|derbisi/.test(t))              return 'Spor';
  if (/çocuk|kids|aile|family/.test(t))                              return 'Çocuk & Aile';
  return 'aktivite';
}

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

const TURKISH_MONTHS = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
};

function decodeHtml(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function parseBubiletCardDate(value = '') {
  const now = new Date();
  const normalized = decodeHtml(value).toLocaleLowerCase('tr-TR');
  const matches = [...normalized.matchAll(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)(?:\s+\S+)?(?:\s+(\d{1,2}):(\d{2}))?/gi)];

  for (const match of matches) {
    let year = now.getFullYear();
    const hour = Number(match[3] || 20);
    const minute = Number(match[4] || 0);
    // BuBilet metinleri Türkiye saatidir. GitHub/Render UTC'de çalıştığı için
    // normal `new Date(y, m, d, h)` kullanımı saati ekranda +3 kaydırıyordu.
    const createIstanbulDate = targetYear =>
      new Date(Date.UTC(targetYear, TURKISH_MONTHS[match[2]], Number(match[1]), hour - 3, minute, 0, 0));
    let date = createIstanbulDate(year);
    if (date < now) {
      year += 1;
      date = createIstanbulDate(year);
    }
    return date;
  }

  return null;
}

// ── Gerçek tarayıcı header'ları ile HTTP GET ──────────────────────────────────
function httpGet(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer':         'https://www.google.com/',
        'Cache-Control':   'no-cache',
        'Pragma':          'no-cache',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'cross-site',
        'Upgrade-Insecure-Requests': '1',
      },
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return httpGet(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
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
  // Bubilet şehir etkinlik sayfası URL'leri (birden fazla dene)
  const urlsToTry = [
    `https://www.bubilet.com.tr/${citySlug}`,
    `https://www.bubilet.com.tr/etkinlikler/${citySlug}`,
  ];

  for (const url of urlsToTry) {
    console.log(`   📡 Bubilet: ${cityName} → ${url}`);
    try {
      const html = await httpGet(url, 12000);
      const events = [];
      const now = new Date();

      // ── Strateji 1: JSON-LD structured data ──────────────────────────────
      const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const match of jsonLdMatches) {
        try {
          const parsed = JSON.parse(match[1]);
          const items  = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
          for (const item of items) {
            if (item['@type'] !== 'Event' && item['@type'] !== 'MusicEvent') continue;
            const name = item.name;
            if (!name || name.length < 3) continue;
            const startDate = item.startDate ? new Date(item.startDate) : null;
            if (!startDate || isNaN(startDate) || startDate < now) continue;

            const location = item.location?.name || item.location?.address?.streetAddress || cityName;
            const imgRaw   = Array.isArray(item.image) ? item.image[0] : (item.image || '');
            // Bilet URL: etkinliğe özgü Bubilet detay sayfası
            const rawTicket = item.offers?.url || item.url || null;
            const ticketUrl = safeTicketUrl(
              rawTicket
                ? (rawTicket.startsWith('http') ? rawTicket : `https://www.bubilet.com.tr${rawTicket}`)
                : null
            );
            const category = detectCategory(name);
            const imageUrl = (imgRaw && imgRaw.startsWith('http')) ? imgRaw : categoryImage(category, name);

            events.push({
              externalId:  bubiletExternalId(citySlug, name, startDate, ticketUrl),
              name,
              description: (item.description || '').slice(0, 300),
              imageUrl,
              category,
              location:    `${location}, ${cityName}`,
              mapsQuery:   `${location} ${cityName}`,
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
        } catch (_) { /* JSON parse hatası */ }
      }

      // ── Strateji 2: Href tabanlı etkinlik linkleri ───────────────────────
      if (events.length === 0) {
        // Güncel BuBilet sayfası tarih bilgisini HTML kartında yayımlıyor.
        // Her kartı kendi href/title/img/venue/date alanlarıyla eşleştiririz;
        // farklı kartların görsel ve başlıkları asla çaprazlanmaz.
        const cardPattern = /<a[^>]*title="([^"]+)"[^>]*href="(\/[a-z-]+\/etkinlik\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;

        for (const match of html.matchAll(cardPattern)) {
          const name = decodeHtml(match[1]);
          const ticketUrl = safeTicketUrl(`https://www.bubilet.com.tr${match[2]}`);
          const cardHtml = match[3];
          const imageUrl = cardHtml.match(/<img[^>]*\ssrc="([^"]+)"/i)?.[1] || '';
          const details = [...cardHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(item => decodeHtml(item[1]));
          const venue = details[0] || cityName;
          const eventDate = parseBubiletCardDate(details[1] || '');

          if (!name || name.length < 3 || !eventDate) continue;

          const category = detectCategory(name);
          events.push({
            externalId: bubiletExternalId(citySlug, name, eventDate, ticketUrl),
            name,
            description: `BuBilet'ten güncel ${category.toLocaleLowerCase('tr-TR')} etkinliği.`,
            imageUrl: imageUrl || categoryImage(category, name),
            category,
            location: `${venue}, ${cityName}`,
            mapsQuery: `${venue} ${cityName}`,
            ticketUrl,
            isLiveEvent: true,
            eventDate,
            expireAt: expireIn10Days(eventDate),
            eventSource: 'Bubilet',
            city: cityName,
            isFeatured: false,
            budget: '₺₺',
          });
        }
      }

      if (events.length === 0) {
        // Bubilet URL pattern: /istanbul/etkinlik/... veya /bilet/...
        const linkPatterns = [
          /href="(\/[a-z-]+\/etkinlik\/[^"?#]+)"/gi,
          /href="(https:\/\/www\.bubilet\.com\.tr\/[^"?#]*\/etkinlik\/[^"?#]+)"/gi,
          /href="(\/bilet\/[^"?#]{5,})"/gi,
        ];

        const foundLinks = new Set();
        for (const pattern of linkPatterns) {
          [...html.matchAll(pattern)].forEach(m => foundLinks.add(m[1]));
        }

        const titleMatches = [...html.matchAll(/class="[^"]*(?:event|card|title)[^"]*"[^>]*>\s*<[^>]+>\s*([^<]{5,80})\s*</gi)];
        const dateMatches  = [...html.matchAll(/datetime="([^"]+)"/g)];
        const imgMatches   = [...html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]*(?:bubilet|cdn|event)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)];

        const links = [...foundLinks].slice(0, 20);
        for (let i = 0; i < links.length; i++) {
          const rawLink   = links[i];
          const fullLink  = rawLink.startsWith('http') ? rawLink : `https://www.bubilet.com.tr${rawLink}`;
          const ticketUrl = safeTicketUrl(fullLink);

          const rawTitle = titleMatches[i]?.[1]?.trim();
          if (!rawTitle || rawTitle.length < 3) continue;

          const rawDate   = dateMatches[i]?.[1];
          const eventDate = rawDate ? new Date(rawDate) : null;
          if (!eventDate || isNaN(eventDate) || eventDate < now) continue;

          const imgUrl   = imgMatches[i]?.[1] || '';
          const category = detectCategory(rawTitle);

          events.push({
            externalId:  bubiletExternalId(citySlug, rawTitle, eventDate, ticketUrl),
            name:        rawTitle,
            description: '',
            imageUrl:    (imgUrl && imgUrl.startsWith('http')) ? imgUrl : categoryImage(category, rawTitle),
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

      if (events.length > 0) {
        console.log(`      ✅ ${cityName}: ${events.length} etkinlik bulundu`);
        return { city: cityName, events, success: true };
      } else {
        console.warn(`      ⚠️  ${cityName} → ${url}: HTML alındı ama etkinlik parse edilemedi`);
      }
    } catch (err) {
      console.warn(`      ❌ ${cityName} → ${url}: ${err.message}`);
    }
  }

  console.warn(`      ⚠️  ${cityName}: Tüm URL'ler başarısız — bu şehir için etkinlik eklenmeyecek.`);
  return { city: cityName, events: [], success: false };
}

// ── Ana Fonksiyon ─────────────────────────────────────────────────────────────
async function main() {
  const isDryRun = process.env.DRY_RUN === '1';
  const MONGO_URI = process.env.MONGO_URI;
  if (!isDryRun && !MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  if (!isDryRun) {
    console.log('🔌 MongoDB bağlanıyor...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Bağlandı.\n');
  } else {
    console.log('🧪 DRY_RUN: Veritabanına yazılmayacak.\n');
  }

  // Yeni veri doğrulanana kadar mevcut gerçek etkinlikler korunur.
  console.log('🛡️ Mevcut etkinlikler korunuyor; yeni veri önce doğrulanacak.');

  // ADIM 2: Bubilet scraping
  console.log('📡 Bubilet scraping başlıyor...\n');
  let allEvents = [];
  for (const city of CITIES) {
    const result = await scrapeBubiletCity(city.name, city.slug);
    allEvents = allEvents.concat(result.events);
    await new Promise(r => setTimeout(r, 1200)); // Rate limit arası bekleme
  }

  // ADIM 3: Sonuç değerlendirmesi
  if (allEvents.length === 0) {
    console.warn('\n⚠️  Scraping başarısız — hiçbir etkinlik bulunamadı.');
    console.warn("   DB'ye SAHTE VERİ eklenmedi. İşlem sonlandırıldı.");
    console.warn('   Öneri: node scripts/seedEvents.js ile manuel seed yapın.');
    if (!isDryRun) await mongoose.disconnect();
    process.exit(1); // GitHub Actions başarısızlığı görünür kılar; mevcut veri korunur.
  }

  // ADIM 4: Deduplicate
  const seen   = new Set();
  const unique = allEvents.filter(e => {
    if (!e.externalId || seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  if (isDryRun) {
    console.log(`\n✅ DRY_RUN: ${unique.length} gerçek etkinlik bulundu; veritabanına yazılmadı.`);
    return;
  }

  // ADIM 5: Kaydet
  try {
    // Yeni listeyi doğrulamadan eski kayıtları silmeyiz. Böylece kaynak geçici
    // olarak erişilemezse uygulamada boş etkinlik alanı oluşmaz.
    const { deletedCount } = await Candidate.deleteMany({
      isLiveEvent: true,
      eventSource: 'Bubilet',
    });
    await Candidate.insertMany(unique, { ordered: false });
    console.log(`\n✅ ${unique.length} gerçek etkinlik veritabanına kaydedildi (${deletedCount} eski kayıt yenilendi).`);
  } catch (err) {
    console.warn('⚠️  Bazı kayıtlar atlandı (duplicate):', err.message?.slice(0, 120));
  }

  // ADIM 6: Özet
  const byCity = {};
  unique.forEach(e => { byCity[e.city] = (byCity[e.city] || 0) + 1; });
  console.log('\n📊 Şehir özeti:');
  Object.entries(byCity).forEach(([city, count]) => {
    console.log(`   ${city}: ${count} etkinlik`);
  });

  await mongoose.disconnect();
  console.log('\n✨ Sync tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err.message); process.exit(1); });
