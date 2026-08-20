import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { mockOptions } from '../data/mockOptions.js';
import { catalogAssetSlug, getStaticCatalogImageUrl } from '../services/catalogAssetService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(__dirname, '../../frontend/public');

test('statik katalog yolu Türkçe kart adlarında kararlı üretilir', () => {
  assert.equal(catalogAssetSlug('Çiğ Köfte & Dürüm'), 'cig-kofte-and-durum');
  assert.equal(catalogAssetSlug('The Queen’s Gambit'), 'the-queen-s-gambit');
  assert.equal(
    getStaticCatalogImageUrl('mekan', 'Döner', 'https://images.unsplash.com/photo-1?w=600'),
    '/catalog/mekan/doner.jpg?v=20260820',
  );
  assert.equal(
    getStaticCatalogImageUrl('mekan', 'Döner', 'https://example.com/doner.jpg'),
    null,
  );
  assert.equal(
    getStaticCatalogImageUrl('mekan', 'Köfte', 'https://legacy-image.example/kofte.jpg'),
    '/catalog/mekan/kofte.jpg?v=20260820',
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

test('film ve aktivite kartlarinin yerel gorselleri tarayicida acilabilir formattadir', async () => {
  const cards = ['film', 'aktivite'].flatMap((category) => (mockOptions[category] || [])
    .map((card) => ({ category, ...card })));

  assert.ok(cards.length >= 70, 'film ve aktivite katalogları beklenen çeşitlilikte olmalı');

  await Promise.all(cards.map(async (card) => {
    const staticUrl = getStaticCatalogImageUrl(card.category, card.name, card.imageUrl);
    assert.ok(staticUrl, `${card.name} yerel katalog görseli kullanmalı`);

    const assetPath = path.join(publicDirectory, new URL(staticUrl, 'https://catalog.local').pathname);
    const metadata = await sharp(assetPath).metadata();
    assert.ok(['jpeg', 'png', 'webp', 'avif'].includes(metadata.format), `${card.name} desteklenen bir görsel formatı kullanmalı`);
    assert.ok(metadata.width >= 500 && metadata.height >= 300, `${card.name} kart görseli için yeterli çözünürlüğe sahip olmalı`);
  }));
});
