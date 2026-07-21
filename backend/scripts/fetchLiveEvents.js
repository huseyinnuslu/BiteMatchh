/**
 * fetchLiveEvents.js  (backend/scripts/)
 * BiteMatch – Canlı Etkinlik ETL Scripti  v3
 *
 * Kaynaklar (API key gerektirmez):
 *   1. Biletix (biletix.com/api) – Türkiye'nin en büyük bilet platformu
 *   2. Passo   (passo.com.tr)    – Konsert / Spor / Kültür
 *   3. IBB Açık Veri             – İstanbul Büyükşehir Belediyesi etkinlikleri
 *   4. Eventbrite                – (API key varsa)
 *   5. Ticketmaster              – (API key varsa)
 *
 * Her etkinlik için:
 *   - ticketUrl  → bilet satın alma sayfasının tam URL'i
 *   - mapsQuery  → Google Maps'te konumu açacak sorgu
 *   - imageUrl   → etkinlik görseli (yoksa kategoriye uygun Unsplash)
 *
 * Çalıştırma:
 *   cd backend && node scripts/fetchLiveEvents.js
 */

import mongoose from 'mongoose';
import https    from 'https';
import http     from 'http';
import dotenv   from 'dotenv';
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
    eventDate:   { type: Date,    default: null },
    eventSource: { type: String,  default: null },
    expireAt:    { type: Date,    default: null },
    externalId:  { type: String,  default: null },
  },
  { timestamps: true }
);
candidateSchema.index({ expireAt:    1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ externalId:  1 }, { unique: true, sparse: true });
candidateSchema.index({ isLiveEvent: 1, eventDate: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ── Kategori bazlı Unsplash fallback görseller ────────────────────────────────
const FALLBACK = {
  concert:  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=85',
  sports:   'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=85',
  theater:  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=85',
  art:      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=85',
  festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
  night:    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85',
  comedy:   'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=85',
  default:  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85',
};

function fallbackImage(name = '', cat = '') {
  const t = (name + ' ' + cat).toLowerCase();
  if (/müzik|konser|concert|rock|jazz|pop|klasik|orkestra/.test(t)) return FALLBACK.concert;
  if (/futbol|basket|spor|sport|galata|bjk|fenerbahçe|beşiktaş|trabzon/.test(t)) return FALLBACK.sports;
  if (/tiyatro|theater|sahne|opera|bale|müzikal/.test(t)) return FALLBACK.theater;
  if (/sanat|art|sergi|galeri/.test(t)) return FALLBACK.art;
  if (/festival|fuar|fair/.test(t)) return FALLBACK.festival;
  if (/gece|night|dj|party|parti|bar/.test(t)) return FALLBACK.night;
  if (/stand.?up|komedi|comedy|güldürü/.test(t)) return FALLBACK.comedy;
  return FALLBACK.default;
}

// ── HTTP/HTTPS GET helper ─────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((res, rej) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers, timeout: 12000 }, (r) => {
      // Redirect follow (1 hop)
      if ((r.statusCode === 301 || r.statusCode === 302) && r.headers.location) {
        return fetchJSON(r.headers.location, headers).then(res).catch(rej);
      }
      let d = '';
      r.on('data', c => (d += c));
      r.on('end', () => {
        if (r.statusCode >= 200 && r.statusCode < 300) {
          try { res(JSON.parse(d)); } catch { rej(new Error(`JSON parse: ${url}`)); }
        } else {
          rej(new Error(`HTTP ${r.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error(`Timeout: ${url}`)); });
  });
}

// ── Kaynak 1: Biletix (Türkiye #1 bilet platformu) ───────────────────────────
// Biletix'in resmi web API'si (public endpoint, key gerektirmez)
async function fetchFromBiletix() {
  try {
    console.log('   📡 Biletix sorgulanıyor...');
    const now = new Date();

    // Biletix'in halka açık event listing endpoint'i
    const url = 'https://www.biletix.com/solr/TURK/select?q=*%3A*' +
      '&fq=locale%3ATURK' +
      '&fq=event_enddate%3A%5BNOW%20TO%20*%5D' +
      '&fq=country%3ATurkey' +
      '&fq=region%3AistanBUL' +
      '&rows=30&start=0' +
      '&fl=id,event_name,event_date,venue_name,category_name,imageurl,event_url' +
      '&sort=event_date+asc' +
      '&wt=json';

    const data   = await fetchJSON(url, { 'User-Agent': 'Mozilla/5.0 BiteMatch/3.0' });
    const docs   = data?.response?.docs || [];
    const events = [];

    for (const d of docs) {
      const rawDate = Array.isArray(d.event_date) ? d.event_date[0] : d.event_date;
      const eventDate = rawDate ? new Date(rawDate) : null;
      if (!eventDate || isNaN(eventDate) || eventDate < now) continue;

      const expireAt = new Date(eventDate);
      expireAt.setHours(expireAt.getHours() + 4);

      const name    = Array.isArray(d.event_name) ? d.event_name[0] : (d.event_name || '');
      const venue   = Array.isArray(d.venue_name) ? d.venue_name[0] : (d.venue_name || '');
      const cat     = Array.isArray(d.category_name) ? d.category_name[0] : (d.category_name || '');
      const imgRaw  = Array.isArray(d.imageurl) ? d.imageurl[0] : (d.imageurl || '');
      const eventId = d.id || '';

      // Biletix bilet URL'i: eventId'den oluşturulur
      const ticketUrl = eventId
        ? `https://www.biletix.com/etkinlik/${eventId}/TURK/tr`
        : null;

      const imageUrl = imgRaw
        ? (imgRaw.startsWith('http') ? imgRaw : `https://www.biletix.com${imgRaw}`)
        : fallbackImage(name, cat);

      events.push({
        externalId:  `biletix_${eventId}`,
        name:        name || 'Biletix Etkinliği',
        description: cat,
        imageUrl,
        category:    'aktivite',
        location:    venue ? `${venue}, İstanbul` : 'İstanbul',
        mapsQuery:   venue ? `${venue} İstanbul` : 'İstanbul',
        ticketUrl,
        isLiveEvent: true,
        eventDate,
        expireAt,
        eventSource: 'Biletix',
        budget:      '₺₺',
      });
    }

    console.log(`      ✅ Biletix: ${events.length} etkinlik`);
    return events;
  } catch (err) {
    console.error('   ❌ Biletix:', err.message);
    return [];
  }
}

// ── Kaynak 2: Passo (Türkiye spor/konser platformu) ──────────────────────────
async function fetchFromPasso() {
  try {
    console.log('   📡 Passo sorgulanıyor...');
    const now = new Date();

    // Passo'nun halka açık JSON API'si
    const url = 'https://passo.com.tr/api/listing/events' +
      '?city=istanbul&page=1&limit=30&sort=date_asc';

    const data   = await fetchJSON(url, {
      'User-Agent': 'Mozilla/5.0 BiteMatch/3.0',
      'Accept': 'application/json',
    });

    const items  = data?.data?.events || data?.events || data?.items || [];
    const events = [];

    for (const item of items) {
      const dateStr  = item.start_date || item.date || item.event_date || '';
      const eventDate = dateStr ? new Date(dateStr) : null;
      if (!eventDate || isNaN(eventDate) || eventDate < now) continue;

      const expireAt = new Date(eventDate);
      expireAt.setHours(expireAt.getHours() + 4);

      const name   = item.name || item.title || item.event_name || '';
      const venue  = item.venue?.name || item.venue_name || item.place || '';
      const slug   = item.slug || item.id || '';
      const imgRaw = item.image || item.cover || item.thumbnail || '';

      const ticketUrl = slug
        ? `https://passo.com.tr/etkinlik/${slug}`
        : (item.url || item.link || null);

      const imageUrl = imgRaw
        ? (imgRaw.startsWith('http') ? imgRaw : `https://passo.com.tr${imgRaw}`)
        : fallbackImage(name, '');

      events.push({
        externalId:  `passo_${item.id || slug}`,
        name:        name || 'Passo Etkinliği',
        description: item.description || item.category || '',
        imageUrl,
        category:    'aktivite',
        location:    venue ? `${venue}, İstanbul` : 'İstanbul',
        mapsQuery:   venue ? `${venue} İstanbul` : 'İstanbul',
        ticketUrl,
        isLiveEvent: true,
        eventDate,
        expireAt,
        eventSource: 'Passo',
        budget:      '₺₺',
      });
    }

    console.log(`      ✅ Passo: ${events.length} etkinlik`);
    return events;
  } catch (err) {
    console.error('   ❌ Passo:', err.message);
    return [];
  }
}

// ── Kaynak 3: IBB Açık Veri ───────────────────────────────────────────────────
async function fetchFromIBB() {
  try {
    console.log('   📡 IBB sorgulanıyor...');
    const url =
      'https://data.ibb.gov.tr/api/3/action/datastore_search' +
      '?resource_id=b35f2461-c2f7-43c0-8434-4f5ddfc73e54&limit=50';

    const data    = await fetchJSON(url);
    const records = data?.result?.records || [];
    const now     = new Date();
    const events  = [];

    for (const r of records) {
      const tarihStr  = r['Etkinlik Tarihi'] || r['tarih'] || r['DATE'] || '';
      const eventDate = tarihStr ? new Date(tarihStr) : null;
      if (!eventDate || isNaN(eventDate) || eventDate < now) continue;

      const expireAt = new Date(eventDate);
      expireAt.setHours(expireAt.getHours() + 4);

      const name     = r['Etkinlik Adı'] || r['ad'] || r['NAME'] || 'IBB Etkinliği';
      const mekan    = r['Mekan'] || r['mekan'] || r['LOCATION'] || 'İstanbul';
      const ticketUrl = r['Bilet Linki'] || r['bilet_url'] || r['TICKET_URL'] || null;
      const rawImg   = r['Resim'] || r['resim'] || r['IMAGE'] || '';

      events.push({
        externalId:  `ibb_${r._id || Math.random()}`,
        name,
        description: (r['Açıklama'] || r['aciklama'] || '').slice(0, 300),
        imageUrl:    rawImg || fallbackImage(name, 'kultur'),
        category:    'aktivite',
        location:    `${mekan}, İstanbul`,
        mapsQuery:   `${mekan} İstanbul`,
        ticketUrl,
        isLiveEvent: true,
        eventDate,
        expireAt,
        eventSource: 'IBB',
        budget:      '₺',
      });
    }

    console.log(`      ✅ IBB: ${events.length} etkinlik`);
    return events;
  } catch (err) {
    console.error('   ❌ IBB:', err.message);
    return [];
  }
}

// ── Kaynak 4: Eventbrite (API key gerekir) ────────────────────────────────────
async function fetchFromEventbrite() {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) { console.log('   ⚠️  EVENTBRITE_TOKEN yok, atlanıyor.'); return []; }
  try {
    console.log('   📡 Eventbrite sorgulanıyor...');
    const today = new Date().toISOString().split('T')[0];
    const url   =
      `https://www.eventbriteapi.com/v3/events/search/` +
      `?location.address=Istanbul&location.within=30km` +
      `&start_date.range_start=${today}T00:00:00` +
      `&categories=103,105,110,111,113` +
      `&expand=venue,ticket_classes&page_size=40`;

    const data   = await fetchJSON(url, { Authorization: `Bearer ${token}` });
    const events = (data.events || []).filter(e => e.start?.utc);

    const results = events.map(e => {
      const venue    = e.venue;
      const location = venue?.name ? `${venue.name}, ${venue.address?.city || 'İstanbul'}` : 'İstanbul';
      const expireAt = e.end?.utc ? new Date(e.end.utc) : (() => { const d = new Date(e.start.utc); d.setHours(d.getHours() + 3); return d; })();
      return {
        externalId:  `eventbrite_${e.id}`,
        name:        e.name?.text || 'Eventbrite Etkinliği',
        description: (e.description?.text || '').slice(0, 300),
        imageUrl:    e.logo?.url || fallbackImage(e.name?.text, ''),
        category:    'aktivite',
        location,
        mapsQuery:   venue?.name ? `${venue.name} İstanbul` : 'İstanbul',
        ticketUrl:   e.url || null,
        isLiveEvent: true,
        eventDate:   new Date(e.start.utc),
        expireAt,
        eventSource: 'Eventbrite',
        budget:      '₺₺',
      };
    });

    console.log(`      ✅ Eventbrite: ${results.length} etkinlik`);
    return results;
  } catch (err) {
    console.error('   ❌ Eventbrite:', err.message);
    return [];
  }
}

// ── Kaynak 5: Ticketmaster (API key gerekir) ──────────────────────────────────
async function fetchFromTicketmaster() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) { console.log('   ⚠️  TICKETMASTER_KEY yok, atlanıyor.'); return []; }
  try {
    console.log('   📡 Ticketmaster sorgulanıyor...');
    const today = new Date().toISOString().split('.')[0] + 'Z';
    const url   =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${key}&city=Istanbul&countryCode=TR` +
      `&startDateTime=${today}&size=40` +
      `&classificationName=Music,Arts,Sports,Theatre`;

    const data   = await fetchJSON(url);
    const events = (data._embedded?.events || []).filter(e => e.dates?.start?.dateTime);

    const results = events.map(e => {
      const venue    = e._embedded?.venues?.[0];
      const location = venue?.name ? `${venue.name}, ${venue.city?.name || 'İstanbul'}` : 'İstanbul';
      const bestImg  = e.images?.find(i => i.ratio === '16_9' && i.width >= 640) || e.images?.[0];
      const expireAt = new Date(e.dates.start.dateTime);
      expireAt.setHours(expireAt.getHours() + 3);
      return {
        externalId:  `ticketmaster_${e.id}`,
        name:        e.name,
        description: (e.info || '').slice(0, 300),
        imageUrl:    bestImg?.url || fallbackImage(e.name, ''),
        category:    'aktivite',
        location,
        mapsQuery:   venue?.name ? `${venue.name} İstanbul` : `${e.name} İstanbul`,
        ticketUrl:   e.url || null,
        isLiveEvent: true,
        eventDate:   new Date(e.dates.start.dateTime),
        expireAt,
        eventSource: 'Ticketmaster',
        budget:      '₺₺₺',
      };
    });

    console.log(`      ✅ Ticketmaster: ${results.length} etkinlik`);
    return results;
  } catch (err) {
    console.error('   ❌ Ticketmaster:', err.message);
    return [];
  }
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

  // ADIM 2: Paralel çek
  console.log('📡 Tüm kaynaklar sorgulanıyor...');
  const [biletix, passo, ibb, eb, tm] = await Promise.all([
    fetchFromBiletix(),
    fetchFromPasso(),
    fetchFromIBB(),
    fetchFromEventbrite(),
    fetchFromTicketmaster(),
  ]);

  // ADIM 3: Deduplicate
  const seen   = new Set();
  const unique = [...biletix, ...passo, ...ibb, ...eb, ...tm].filter(e => {
    if (!e.externalId || seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  console.log(`\n🎯 Toplam benzersiz etkinlik: ${unique.length}`);
  console.log(`   Biletix: ${biletix.length} | Passo: ${passo.length} | IBB: ${ibb.length} | Eventbrite: ${eb.length} | Ticketmaster: ${tm.length}`);

  // ADIM 4: Toplu kaydet
  if (unique.length > 0) {
    const saved = await Candidate.insertMany(unique, { ordered: false });
    console.log(`✅ ${saved.length} etkinlik veritabanına kaydedildi.`);
  } else {
    console.log('ℹ️  Kaydedilecek etkinlik yok.');
  }

  await mongoose.disconnect();
  console.log('\n✨ Sync tamamlandı!\n');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
