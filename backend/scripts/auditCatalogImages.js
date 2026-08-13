import { mockOptions } from '../data/mockOptions.js';

const cards = Object.entries(mockOptions)
  .flatMap(([category, items]) => (Array.isArray(items) ? items.map((item) => ({ category, ...item })) : []));
const uniqueCards = [...new Map(cards.filter((card) => card.imageUrl).map((card) => [card.imageUrl, card])).values()];
const failures = [];

for (const card of uniqueCards) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(card.imageUrl, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.startsWith('image/')) {
      failures.push({ name: card.name, category: card.category, status: response.status, contentType, imageUrl: card.imageUrl });
    }
  } catch (error) {
    failures.push({ name: card.name, category: card.category, status: 0, contentType: error.name, imageUrl: card.imageUrl });
  } finally {
    clearTimeout(timeout);
  }
}

if (failures.length) {
  console.error(`Kart görsel denetimi başarısız (${failures.length}/${uniqueCards.length}):`);
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`Kart görsel denetimi başarılı: ${uniqueCards.length} benzersiz görsel erişilebilir.`);
