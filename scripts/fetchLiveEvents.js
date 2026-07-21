/**
 * fetchLiveEvents.js
 * BiteMatch – Canlı Etkinlik ETL Scripti
 *
 * Kaynaklar (öncelik sırasıyla):
 *   1. Eventbrite API  → https://www.eventbriteapi.com/v3/
 *   2. Ticketmaster Discovery API  → https://app.ticketmaster.com/discovery/v2/
 *   3. İBB Açık Veri Portalı  → https://data.ibb.gov.tr (key gerektirmez)
 *
 * Çalıştırma:
 *   MONGO_URI=... EVENTBRITE_TOKEN=... node scripts/fetchLiveEvents.js
 *
 * GitHub Actions: her gece 03:00'te otomatik tetiklenir.
 */

import mongoose from 'mongoose';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// __dirname yerine ESM uyumlu yol
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// .env — backend klasöründen yükle
dotenv.config({ path: resolve(__dirname, '../backend/.env') });

// ── Candidate Şeması (model bağımsız, inline) ────────────────────────────────
// Scriptin standalone çalışabilmesi için modeli burada tanımlıyoruz.
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
    eventDate:   { type: Date, default: null },
    eventSource: { type: String, default: null },
    expireAt:    { type: Date, default: null },
    externalId:  { type: String, index: true }, // duplicate önleme anahtarı
  },
  { timestamps: true }
);

// TTL index — expireAt geçen canlı etkinlikler otomatik silinir
candidateSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true });
candidateSchema.index({ category: 1, isLiveEvent: 1 });

const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ── Yardımcı: HTTPS GET (Promise) ───────────────────────────────────────────
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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
  if (!token) {
    console.log('⚠️  EVENTBRITE_TOKEN tanımlı değil, Eventbrite atlanıyor.');
    return [];
  }

  try {
    const url =
      'https://www.eventbriteapi.com/v3/events/search/' +
      '?location.address=Istanbul' +
      '&location.within=25km' +
      '&start_date.range_start=' + new Date().toISOString().split('T')[0] + 'T00:00:00' +
      '&categories=103,105,110' + // müzik, film/medya, eğlence
      '&expand=venue,ticket_classes' +
      '&page_size=50';

    const data = await httpGet(url, { Authorization: `Bearer ${token}` });
    const events = data.events || [];

    return events
      .filter(e => e.start?.utc && e.end?.utc)
      .map(e => ({
        externalId:  `eventbrite_${e.id}`,
        name:        e.name?.text || 'İsimsiz Etkinlik',
        description: e.description?.text?.slice(0, 300) || e.summary || '',
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
  } catch (err) {
    console.error('❌ Eventbrite hatası:', err.message);
    return [];
  }
}

// ── Kaynak 2: Ticketmaster Discovery API ────────────────────────────────────
async function fetchFromTicketmaster() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) {
    console.log('⚠️  TICKETMASTER_KEY tanımlı değil, Ticketmaster atlanıyor.');
    return [];
  }

  try {
    const today = new Date().toISOString().split('.')[0] + 'Z';
    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${key}` +
      `&city=Istanbul` +
      `&countryCode=TR` +
      `&startDateTime=${today}` +
      `&size=50` +
      `&classificationName=Music,Arts,Sports`;

    const data = await httpGet(url);
    const events = data._embedded?.events || [];

    return events
      .filter(e => e.dates?.start?.dateTime)
      .map(e => {
        const venue   = e._embedded?.venues?.[0];
        const endDate = new Date(e.dates.start.dateTime);
        endDate.setHours(endDate.getHours() + 3); // tahmini bitiş: +3 saat

        return {
          externalId:  `ticketmaster_${e.id}`,
          name:        e.name,
          description: e.info || e.pleaseNote || '',
          imageUrl:    e.images?.find(img => img.ratio === '16_9')?.url || e.images?.[0]?.url || '',
          category:    'aktivite',
          location:    venue?.name ? `${venue.name}, ${venue.city?.name || 'İstanbul'}` : 'İstanbul',
          mapsQuery:   venue?.name ? `${venue.name} ${venue.city?.name || 'İstanbul'}` : `${e.name} İstanbul`,
          isLiveEvent: true,
          eventDate:   new Date(e.dates.start.dateTime),
          expireAt:    endDate,
          eventSource: 'Ticketmaster',
          budget:      '₺₺₺',
        };
      });
  } catch (err) {
    console.error('❌ Ticketmaster hatası:', err.message);
    return [];
  }
}

// ── Kaynak 3: İBB Açık Veri Portalı (API key gerektirmez) ────────────────────
async function fetchFromIBB() {
  try {
    // İBB kültür etkinlikleri dataseti
    const url =
      'https://data.ibb.gov.tr/api/3/action/datastore_search' +
      '?resource_id=b35f2461-c2f7-43c0-8434-4f5ddfc73e54' +
      '&limit=50';

    const data = await httpGet(url);
    const records = data?.result?.records || [];

    const now = new Date();

    return records
      .filter(r => r['Etkinlik Tarihi'] || r['tarih'] || r['DATE'])
      .map((r, i) => {
        const tarihStr = r['Etkinlik Tarihi'] || r['tarih'] || r['DATE'] || '';
        const eventDate = tarihStr ? new Date(tarihStr) : new Date(Date.now() + 7 * 86400000);

        // Tarihi geçmiş etkinlikleri filtrele
        if (eventDate < now) return null;

        const expireAt = new Date(eventDate);
        expireAt.setHours(expireAt.getHours() + 4); // tahmini bitiş

        return {
          externalId:  `ibb_${r._id || i}`,
          name:        r['Etkinlik Adı'] || r['ad'] || r['NAME'] || 'İBB Etkinliği',
          description: r['Açıklama'] || r['aciklama'] || r['DESCRIPTION'] || '',
          imageUrl:    r['Resim'] || r['resim'] || r['IMAGE'] || '',
          category:    'aktivite',
          location:    r['Mekan'] || r['mekan'] || r['LOCATION'] || 'İstanbul',
          mapsQuery:   (r['Mekan'] || 'etkinlik') + ' İstanbul',
          isLiveEvent: true,
          eventDate,
          expireAt,
          eventSource: 'IBB',
          budget:      '₺',
        };
      })
      .filter(Boolean); // null olanları çıkar
  } catch (err) {
    console.error('❌ İBB Açık Veri hatası:', err.message);
    return [];
  }
}

// ── Upsert: Duplicate olmadan MongoDB'ye kaydet ──────────────────────────────
async function upsertEvents(events) {
  if (!events.length) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated  = 0;

  const ops = events.map(ev => ({
    updateOne: {
      filter: { externalId: ev.externalId },
      update: { $set: ev },
      upsert: true,
    },
  }));

  const result = await Candidate.bulkWrite(ops, { ordered: false });
  inserted = result.upsertedCount || 0;
  updated  = result.modifiedCount || 0;

  return { inserted, updated };
}

// ── Ana Fonksiyon ────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable tanımlı değil!');
    process.exit(1);
  }

  console.log('🔌 MongoDB bağlantısı kuruluyor...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB bağlandı.');

  console.log('\n📡 Etkinlik kaynakları sorgulanıyor...\n');

  // Tüm kaynakları paralel çek
  const [ebEvents, tmEvents, ibbEvents] = await Promise.all([
    fetchFromEventbrite(),
    fetchFromTicketmaster(),
    fetchFromIBB(),
  ]);

  console.log(`   Eventbrite    : ${ebEvents.length} etkinlik`);
  console.log(`   Ticketmaster  : ${tmEvents.length} etkinlik`);
  console.log(`   İBB Açık Veri : ${ibbEvents.length} etkinlik`);

  const allEvents = [...ebEvents, ...tmEvents, ...ibbEvents];

  // externalId'ye göre deduplicate (birden fazla kaynaktan gelebilir)
  const seen = new Set();
  const unique = allEvents.filter(e => {
    if (seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });

  console.log(`\n🎯 Toplam benzersiz etkinlik: ${unique.length}`);

  if (unique.length > 0) {
    const { inserted, updated } = await upsertEvents(unique);
    console.log(`✅ Kaydedildi: ${inserted} yeni | ${updated} güncellendi`);
  } else {
    console.log('ℹ️  Kaydedilecek yeni etkinlik bulunamadı.');
  }

  // Süresi geçmiş etkinlikleri TTL beklemeden temizle
  const expired = await Candidate.deleteMany({
    isLiveEvent: true,
    expireAt: { $lt: new Date() },
  });
  if (expired.deletedCount > 0) {
    console.log(`🗑️  ${expired.deletedCount} süresi geçmiş etkinlik temizlendi.`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 MongoDB bağlantısı kapatıldı.');
  console.log('✨ Sync tamamlandı!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('💥 Script hatası:', err);
  process.exit(1);
});
