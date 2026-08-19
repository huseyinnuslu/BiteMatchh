import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockOptions } from '../data/mockOptions.js';
import { catalogAssetSlug, getStaticCatalogImageUrl } from '../services/catalogAssetService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(__dirname, '../../frontend/public');

test('statik katalog yolu Türkçe kart adlarında kararlı üretilir', () => {
  assert.equal(catalogAssetSlug('Çiğ Köfte & Dürüm'), 'cig-kofte-and-durum');
  assert.equal(catalogAssetSlug('The Queen’s Gambit'), 'the-queen-s-gambit');
  assert.equal(
    getStaticCatalogImageUrl('mekan', 'Döner', 'https://images.unsplash.com/photo-1?w=600'),
    '/catalog/mekan/doner.jpg?v=20260819',
  );
  assert.equal(
    getStaticCatalogImageUrl('mekan', 'Döner', 'https://example.com/doner.jpg'),
    null,
  );
});

test('statik olarak işaretlenen her katalog görseli repoda bulunur', async () => {
  const cards = ['mekan', 'film', 'aktivite'].flatMap((category) => (mockOptions[category] || [])
    .map((card) => ({ category, ...card })));
  const staticCards = cards.filter((card) => getStaticCatalogImageUrl(card.category, card.name, card.imageUrl));

  assert.ok(staticCards.length >= 90, 'statik katalog kitaplığı yeterli sayıda kart içermeli');
  await Promise.all(staticCards.map(async (card) => {
    const staticUrl = getStaticCatalogImageUrl(card.category, card.name, card.imageUrl);
    const assetPath = path.join(publicDirectory, new URL(staticUrl, 'https://catalog.local').pathname);
    const stat = await fs.stat(assetPath);
    assert.ok(stat.size > 1024, `${card.name} için katalog görseli eksik veya geçersiz`);
  }));
});
