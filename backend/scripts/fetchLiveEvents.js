/**
 * fetchLiveEvents.js  (backend/scripts/)
 * BiteMatch – Canlı Etkinlik ETL Scripti  v2
 *
 * Akış:
 *   1. DB'deki eski canlı etkinlikleri temizle (fresh start)
 *   2. Tüm kaynaklardan paralel çek (Eventbrite / Ticketmaster / IBB)
 *   3. Kategoriye göre fallback görsel ata (API'den gelmiyorsa)
 *   4. ticketUrl, location, eventDate doğru eşleştir
 *   5. insertMany ile toplu kaydet
 *
 * Çalıştırma:
 *   cd backend && node scripts/fetchLiveEvents.js
 */

import mongoose from 'mongoose';
import https    from 'https';
import dotenv   from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

// ── Candidate şeması (inline — standalone script) ────────────────────────────
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
    eventDate:   { type: Date,    default: null },
    eventSource: { type: String,  default: null },
    expireAt:    { type: Date,    default: null },
    externalId:  { type: String,  default: null },
  },
  { timestamps: true }
);
candidateSchema.index({ expireAt:   1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ── Kategori bazlı yüksek kaliteli Unsplash fallback görselleri ───────────────
const FALLBACK_IMAGES = {
  // Müzik & Konser
  music:    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
  concert:  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
  // Spor
  sports:   'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
  football: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
  // Tiyatro & Sahne Sanatları
  theater:  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
  arts:     'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
  // Sanat & Kültür
  culture:  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85',
  art:      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85',
  // Festival
  festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
  // Gece Hayatı / Parti
  nightlife:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85',
  // Varsayılan
  default:  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85',
};

/**
 * Etkinlik adı ve kategorisine göre en uygun fallback görsel URL'ini döndür.
 */
function resolveFallbackImage(name = '', category = '') {
  const text = (name + ' ' + category).toLowerCase();
  if (/müzik|konser|concert|music|rock|jazz|pop|klasik|orkestra/.test(text)) return FALLBACK_IMAGES.concert;
  if (/futbol|football|galata|fenerbahçe|beşiktaş|trabzon|bjk|fbtv|gsf|derby|derbi|spor|sport|basket|tenis/.test(text)) return FALLBACK_IMAGES.sports;
  if (/tiyatro|theater|sahne|opera|bale|müzikal|musical/.test(text)) return FALLBACK_IMAGES.theater;
  if (/sanat|art|sergi|exhibition|galeri|gallery/.test(text)) return FALLBACK_IMAGES.art;
  if (/festival|fair|fuar/.test(text)) return FALLBACK_IMAGES.festival;
  if (/gece|night|party|parti|dj|bar|pub/.test(text)) return FALLBACK_IMAGES.nightlife;
  if (/kültür|culture|müze|museum/.test(text)) return FALLBACK_IMAGES.culture;
  return FALLBACK_IMAGES.default;
}

// ── HTTPS GET (Promise) ──────────────────────────────────────────────────────
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`JSON parse hatası: ${url}`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// ── Kaynak 1: Eventbrite ─────────────────────────────────────────────────────
async function fetchFromEventbrite() {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) { console.log('⚠️  EVENTBRITE_TOKEN yok, atlanıyor.'); return []; }

  try {
    const today = new Date().toISOString().split('T')[0];
    const url =
      `https://www.eventbriteapi.com/v3/events/search/` +
      `?location.address=Istanbul&location.within=30km` +
      `&start_date.range_start=${today}T00:00:00` +
      `&categories=103,105,110,111,113` + // müzik, film, eğlence, spor, tiyatro
      `&expand=venue,ticket_classes,format` +
      `&page_size=50`;

    const data   = await httpGet(url, { Authorization: `Bearer ${token}` });
    const events = (data.events || []).filter(e => e.start?.utc && e.end?.utc);

    return events.map(e => {
      const venueName = e.venue?.name || '';
      const venueCity = e.venue?.address?.city || 'İstanbul';
      const location  = venueName
        ? `${venueName}, ${venueCity}`
        : venueCity;

      // Görsel: logo > banner > kategoriye uygun fallback
      const rawImg = e.logo?.url || e.logo?.original?.url || '';
      const imageUrl = rawImg || resolveFallbackImage(e.name?.text, 'concert');

      // Bitiş: API varsa kullan, yoksa +3 saat
      const expireAt = e.end?.utc
        ? new Date(e.end.utc)
        : (() => { const d = new Date(e.start.utc); d.setHours(d.getHours() + 3); return d; })();

      return {
        externalId:  `eventbrite_${e.id}`,
        name:        e.name?.text || 'İsimsiz Etkinlik',
        description: (e.description?.text || e.summary || '').slice(0, 300),
        imageUrl,
        category:    'aktivite',
        location,
        mapsQuery:   venueName ? `${venueName} ${venueCity}` : `etkinlik ${venueCity}`,
        ticketUrl:   e.url || null,
        isLiveEvent: true,
        eventDate:   new Date(e.start.utc),
        expireAt,
        eventSource: 'Eventbrite',
        budget:      '₺₺',
      };
    });
  } catch (err) {
    console.error('❌ Eventbrite:', err.message);
    return [];
  }
}

// ── Kaynak 2: Ticketmaster Discovery API ─────────────────────────────────────
async function fetchFromTicketmaster() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) { console.log('⚠️  TICKETMASTER_KEY yok, atlanıyor.'); return []; }

  try {
    const today = new Date().toISOString().split('.')[0] + 'Z';
    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${key}&city=Istanbul&countryCode=TR` +
      `&startDateTime=${today}&size=50` +
      `&classificationName=Music,Arts,Sports,Theatre`;

    const data   = await httpGet(url);
    const events = (data._embedded?.events || []).filter(e => e.dates?.start?.dateTime);

    return events.map(e => {
      const venue    = e._embedded?.venues?.[0];
      const venueName = venue?.name || '';
      const venueCity = venue?.city?.name || 'İstanbul';
      const location  = venueName ? `${venueName}, ${venueCity}` : venueCity;

      // Görsel: 16:9 formatını tercih et
      const bestImg = e.images?.find(i => i.ratio === '16_9' && i.width >= 640)
        || e.images?.find(i => i.ratio === '16_9')
        || e.images?.[0];
      const rawImg  = bestImg?.url || '';
      const genre   = e.classifications?.[0]?.genre?.name?.toLowerCase() || '';
      const imageUrl = rawImg || resolveFallbackImage(e.name, genre);

      const expireAt = new Date(e.dates.start.dateTime);
      expireAt.setHours(expireAt.getHours() + 3);

      // priceRange varsa budget olarak göster
      const minPrice = e.priceRanges?.[0]?.min;
      const currency = e.priceRanges?.[0]?.currency || 'TRY';
      const budget   = minPrice ? `${Math.round(minPrice)} ${currency}'den başlıyor` : '₺₺₺';

      return {
        externalId:  `ticketmaster_${e.id}`,
        name:        e.name,
        description: (e.info || e.pleaseNote || e.additionalInfo || '').slice(0, 300),
        imageUrl,
        category:    'aktivite',
        location,
        mapsQuery:   venueName ? `${venueName} ${venueCity}` : `${e.name} ${venueCity}`,
        ticketUrl:   e.url || null,
        isLiveEvent: true,
        eventDate:   new Date(e.dates.start.dateTime),
        expireAt,
        eventSource: 'Ticketmaster',
        budget,
      };
    });
  } catch (err) {
    console.error('❌ Ticketmaster:', err.message);
    return [];
  }
}

// ── Kaynak 3: İBB Açık Veri (API key gerektirmez) ────────────────────────────
async function fetchFromIBB() {
  try {
    const url =
      'https://data.ibb.gov.tr/api/3/action/datastore_search' +
      '?resource_id=b35f2461-c2f7-43c0-8434-4f5ddfc73e54&limit=50';

    const data    = await httpGet(url);
    const records = data?.result?.records || [];
    const now     = new Date();

    return records
      .map((r, i) => {
        const tarihStr = r['Etkinlik Tarihi'] || r['tarih'] || r['DATE'] || '';
        const eventDate = tarihStr ? new Date(tarihStr) : null;
        if (!eventDate || isNaN(eventDate) || eventDate < now) return null;

        const expireAt = new Date(eventDate);
        expireAt.setHours(expireAt.getHours() + 4);

        const name     = r['Etkinlik Adı'] || r['ad'] || r['NAME'] || 'İBB Etkinliği';
        const mekan    = r['Mekan'] || r['mekan'] || r['LOCATION'] || 'İstanbul';
        const biletUrl = r['Bilet Linki'] || r['bilet_url'] || r['TICKET_URL'] || null;
        const rawImg   = r['Resim'] || r['resim'] || r['IMAGE'] || '';
        const imageUrl = rawImg || resolveFallbackImage(name, 'kultur');

        return {
          externalId:  `ibb_${r._id || i}`,
          name,
          description: (r['Açıklama'] || r['aciklama'] || '').slice(0, 300),
          imageUrl,
          category:    'aktivite',
          location:    mekan,
          mapsQuery:   `${mekan} İstanbul`,
          ticketUrl:   biletUrl,
          isLiveEvent: true,
          eventDate,
          expireAt,
          eventSource: 'IBB',
          budget:      '₺',
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error('❌ İBB:', err.message);
    return [];
  }
}

// ── Ana Fonksiyon ────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  // ── ADIM 1: Eski canlı etkinlikleri temizle (fresh start) ────────────────
  console.log('🧹 Eski canlı etkinlikler temizleniyor...');
  const deleted = await Candidate.deleteMany({ isLiveEvent: true });
  console.log(`   ${deleted.deletedCount} eski etkinlik silindi.\n`);

  // ── ADIM 2: Tüm kaynaklardan paralel çek ─────────────────────────────────
  console.log('📡 Etkinlik kaynakları sorgulanıyor...');
  const [eb, tm, ibb] = await Promise.all([
    fetchFromEventbrite(),
    fetchFromTicketmaster(),
    fetchFromIBB(),
  ]);

  console.log(`   Eventbrite   : ${eb.length}`);
  console.log(`   Ticketmaster : ${tm.length}`);
  console.log(`   İBB          : ${ibb.length}`);

  // ── ADIM 3: Deduplicate (externalId) ─────────────────────────────────────
  const seen   = new Set();
  const unique = [...eb, ...tm, ...ibb].filter(e => {
    if (!e.externalId || seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  console.log(`\n🎯 Benzersiz etkinlik: ${unique.length}`);

  // ── ADIM 4: Toplu kaydet ──────────────────────────────────────────────────
  if (unique.length > 0) {
    const result = await Candidate.insertMany(unique, { ordered: false });
    console.log(`✅ ${result.length} etkinlik kaydedildi.`);
  } else {
    console.log('ℹ️  Kaydedilecek etkinlik bulunamadı (API key eksik veya kaynaklar boş).');
  }

  await mongoose.disconnect();
  console.log('\n✨ Sync tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
