import CatalogOverride from '../models/CatalogOverride.js';
import { mockOptions } from '../data/mockOptions.js';

// Bu kartlar eski sürümlerde yönetim panelinden düzenlenmiş olabilir. O durumda
// CatalogOverride, kaynak katalogdaki yeni görseli gölgeler. Bu küçük geçiş,
// yalnızca görsel alanını günceller; adminin isim, açıklama ve diğer tüm
// düzenlemeleri aynen korunur.
const REFRESHED_FOOD_CARD_NAMES = new Set([
  'Mantı & Ev Yemekleri',
  'Mangal & Izgara',
  'Tatlı & Waffle',
  'Wok & Noodle',
  'Köfte',
  'Lahmacun & Pide',
  'Kıymalı Pide',
]);

export const synchronizeRefreshedFoodImages = async () => {
  const refreshedCards = (mockOptions.mekan || []).filter((card) => REFRESHED_FOOD_CARD_NAMES.has(card.name));

  await Promise.all(refreshedCards.map(({ name, imageUrl }) => CatalogOverride.updateOne(
    { category: 'mekan', sourceName: name },
    { $set: { 'changes.imageUrl': imageUrl } },
  )));
};
