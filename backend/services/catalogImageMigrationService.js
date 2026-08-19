import CatalogOverride from '../models/CatalogOverride.js';
import { mockOptions } from '../data/mockOptions.js';
import { getStaticCatalogImageUrl } from './catalogAssetService.js';

// Bu kartlar eski sürümlerde yönetim panelinden düzenlenmiş olabilir. O durumda
// CatalogOverride, kaynak katalogdaki yeni görseli gölgeler. Bu geçiş yalnızca
// imageUrl alanını günceller; adminin isim, açıklama ve diğer düzenlemeleri korunur.
const REFRESHED_CARD_NAMES = new Set([
  'Mantı & Ev Yemekleri',
  'Mangal & Izgara',
  'Tatlı & Waffle',
  'Wok & Noodle',
  'Köfte',
  'Lahmacun & Pide',
  'Kıymalı Pide',
  'Arcane',
  'Seramik Atölyesi',
  'Tantuni',
  'Döner',
  'Ramen & Asya Mutfağı',
  'Serpme Kahvaltı',
  'Makarna & İtalyan',
  'Tavuk Kanat & Çıtır Tavuk',
]);

export const synchronizeRefreshedFoodImages = async () => {
  const refreshedCards = ['mekan', 'film', 'aktivite']
    .flatMap((category) => (mockOptions[category] || []).map((card) => ({ ...card, category })))
    .filter((card) => REFRESHED_CARD_NAMES.has(card.name));

  await Promise.all(refreshedCards.map(({ name, imageUrl, category }) => CatalogOverride.updateOne(
    { category, sourceName: name },
    // Bu otomatik geçişte mümkünse dış URL değil, Vercel CDN'deki katalog
    // kopyası kaydedilir. Böylece eski yönetim override'ları da yeni
    // görsel altyapısını atlamaz.
    { $set: { 'changes.imageUrl': getStaticCatalogImageUrl(category, name, imageUrl) || imageUrl } },
  )));
};
