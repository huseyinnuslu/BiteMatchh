import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockOptions } from '../data/mockOptions.js';
import { getStaticCatalogImageUrl } from '../services/catalogAssetService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIRECTORY = path.resolve(__dirname, '../../frontend/public');
const CATEGORIES = ['mekan', 'film', 'aktivite'];
const CONCURRENCY = 5;

const cards = CATEGORIES.flatMap((category) => (mockOptions[category] || [])
  .map((card) => ({ category, ...card, staticUrl: getStaticCatalogImageUrl(category, card.name, card.imageUrl) }))
  .filter((card) => card.staticUrl));

const uniqueCards = [...new Map(cards.map((card) => [card.staticUrl, card])).values()];
const failures = [];

const downloadOne = async (card) => {
  const staticPath = new URL(card.staticUrl, 'https://catalog.local').pathname;
  const targetPath = path.join(PUBLIC_DIRECTORY, staticPath.replace(/^\//, ''));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  const response = await fetch(card.imageUrl, { headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' } });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.startsWith('image/')) {
    throw new Error(`${response.status} ${contentType || 'geçersiz içerik türü'}`);
  }

  const image = Buffer.from(await response.arrayBuffer());
  if (image.length < 1024) throw new Error('görsel dosyası beklenenden küçük');
  await fs.writeFile(targetPath, image);
};

const queue = [...uniqueCards];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const card = queue.shift();
    try {
      await downloadOne(card);
      process.stdout.write(`✓ ${card.category}: ${card.name}\n`);
    } catch (error) {
      failures.push({ name: card.name, category: card.category, imageUrl: card.imageUrl, error: error.message });
      process.stderr.write(`✗ ${card.category}: ${card.name} — ${error.message}\n`);
    }
  }
});

await Promise.all(workers);

if (failures.length) {
  console.error(`\nStatik katalog görsel aktarımı tamamlanamadı (${failures.length}/${uniqueCards.length}).`);
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`\nStatik katalog görsel kütüphanesi hazır: ${uniqueCards.length} görsel.`);
