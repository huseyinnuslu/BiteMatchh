/**
 * fetchLiveEvents.js  (backend/scripts/ altında çalışır)
 * BiteMatch – Canlı Etkinlik ETL Scripti
 *
 * Kaynaklar:
 *   1. Eventbrite API  (EVENTBRITE_TOKEN gerekir — ücretsiz)
 *   2. Ticketmaster    (TICKETMASTER_KEY gerekir — ücretsiz)
 *   3. İBB Açık Veri   (key gerektirmez ✅)
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

// .env → backend klasöründe (bir üst dizin)
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
    isLiveEvent: { type: Boolean, default: false },
    eventDate:   { type: Date,    default: null },
    eventSource: { type: String,  default: null },
    expireAt:    { type: Date,    default: null },
    externalId:  { type: String,  default: null },
  },
  { timestamps: true }
);
candidateSchema.index({ expireAt:   1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ externalId: 1 }, { unique: true, sparse: true });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

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

// ── Eventbrite ───────────────────────────────────────────────────────────────
async function fetchFromEventbrite() {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) { console.log('⚠️  EVENTBRITE_TOKEN yok, atlanıyor.'); return []; }
  try {
    const today = new Date().toISOString().split('T')[0];
    const url =
      `https://www.eventbriteapi.com/v3/events/search/` +
      `?location.address=Istanbul&location.within=25km` +
      `&start_date.range_start=${today}T00:00:00` +
      `&categories=103,105,110&expand=venue&page_size=50`;
    const data   = await httpGet(url, { Authorization: `Bearer ${token}` });
    const events = data.events || [];
    return events.filter(e => e.start?.utc && e.end?.utc).map(e => ({
      externalId:  `eventbrite_${e.id}`,
      name:        e.name?.text || 'İsimsiz Etkinlik',
      description: (e.description?.text || e.summary || '').slice(0, 300),
      imageUrl:    e.logo?.url || '',
      category:    'aktivite',
      location:    e.venue?.address?.localized_address_display || 'İstanbul',
      mapsQuery:   `${e.name?.text} ${e.venue?.address?.city || 'İstanbul'}`,
      isLiveEvent: true,
      eventDate:   new Date(e.start.utc),
      expireAt:    new Date(e.end.utc),
      eventSource: 'Eventbrite',
      budget:      '₺₺',
    }));
  } catch (err) { console.error('❌ Eventbrite:', err.message); return []; }
}

// ── Ticketmaster ─────────────────────────────────────────────────────────────
async function fetchFromTicketmaster() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) { console.log('⚠️  TICKETMASTER_KEY yok, atlanıyor.'); return []; }
  try {
    const today = new Date().toISOString().split('.')[0] + 'Z';
    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${key}&city=Istanbul&countryCode=TR` +
      `&startDateTime=${today}&size=50&classificationName=Music,Arts,Sports`;
    const data   = await httpGet(url);
    const events = data._embedded?.events || [];
    return events.filter(e => e.dates?.start?.dateTime).map(e => {
      const venue   = e._embedded?.venues?.[0];
      const endDate = new Date(e.dates.start.dateTime);
      endDate.setHours(endDate.getHours() + 3);
      return {
        externalId:  `ticketmaster_${e.id}`,
        name:        e.name,
        description: (e.info || e.pleaseNote || '').slice(0, 300),
        imageUrl:    e.images?.find(i => i.ratio === '16_9')?.url || '',
        category:    'aktivite',
        location:    venue ? `${venue.name}, ${venue.city?.name || 'İstanbul'}` : 'İstanbul',
        mapsQuery:   venue ? `${venue.name} ${venue.city?.name || 'İstanbul'}` : `${e.name} İstanbul`,
        isLiveEvent: true,
        eventDate:   new Date(e.dates.start.dateTime),
        expireAt:    endDate,
        eventSource: 'Ticketmaster',
        budget:      '₺₺₺',
      };
    });
  } catch (err) { console.error('❌ Ticketmaster:', err.message); return []; }
}

// ── İBB Açık Veri ────────────────────────────────────────────────────────────
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
        const tarihStr  = r['Etkinlik Tarihi'] || r['tarih'] || r['DATE'] || '';
        const eventDate = tarihStr ? new Date(tarihStr) : null;
        if (!eventDate || eventDate < now) return null;
        const expireAt  = new Date(eventDate);
        expireAt.setHours(expireAt.getHours() + 4);
        return {
          externalId:  `ibb_${r._id || i}`,
          name:        r['Etkinlik Adı'] || r['ad'] || r['NAME'] || 'İBB Etkinliği',
          description: (r['Açıklama'] || r['aciklama'] || '').slice(0, 300),
          imageUrl:    r['Resim'] || r['resim'] || '',
          category:    'aktivite',
          location:    r['Mekan'] || r['mekan'] || 'İstanbul',
          mapsQuery:   `${r['Mekan'] || 'etkinlik mekanı'} İstanbul`,
          isLiveEvent: true,
          eventDate,
          expireAt,
          eventSource: 'IBB',
          budget:      '₺',
        };
      })
      .filter(Boolean);
  } catch (err) { console.error('❌ İBB:', err.message); return []; }
}

// ── Ana Fonksiyon ────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error('❌ MONGO_URI tanımlı değil!'); process.exit(1); }

  console.log('🔌 MongoDB bağlanıyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Bağlandı.\n');

  const [eb, tm, ibb] = await Promise.all([
    fetchFromEventbrite(),
    fetchFromTicketmaster(),
    fetchFromIBB(),
  ]);

  console.log(`\n   Eventbrite   : ${eb.length}`);
  console.log(`   Ticketmaster : ${tm.length}`);
  console.log(`   İBB          : ${ibb.length}`);

  const seen   = new Set();
  const unique = [...eb, ...tm, ...ibb].filter(e => {
    if (seen.has(e.externalId)) return false;
    seen.add(e.externalId); return true;
  });

  console.log(`\n🎯 Benzersiz etkinlik: ${unique.length}`);

  if (unique.length > 0) {
    const ops    = unique.map(ev => ({
      updateOne: { filter: { externalId: ev.externalId }, update: { $set: ev }, upsert: true },
    }));
    const result = await Candidate.bulkWrite(ops, { ordered: false });
    console.log(`✅ ${result.upsertedCount} yeni | ${result.modifiedCount} güncellendi`);
  }

  // TTL öncesi manuel temizlik
  const del = await Candidate.deleteMany({ isLiveEvent: true, expireAt: { $lt: new Date() } });
  if (del.deletedCount) console.log(`🗑️  ${del.deletedCount} süresi dolmuş etkinlik silindi`);

  await mongoose.disconnect();
  console.log('\n✨ Sync tamamlandı!');
  process.exit(0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
