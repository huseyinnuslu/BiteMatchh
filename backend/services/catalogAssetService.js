const STATIC_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'images.pexels.com',
]);
const CATALOG_ASSET_VERSION = '20260819';

// Haricî kaynağı güvenilir olmayan bu kartlar için görseli doğrudan ürün
// kütüphanemizde tutuyoruz. Böylece kart açılırken üçüncü taraf görsel isteği
// beklenmez ve kaynak geçici olarak kapansa da görünüm bozulmaz.
const GENERATED_CATALOG_ASSETS = new Set([
  'mekan:Lahmacun & Pide',
  'mekan:Köfte',
  'mekan:Kıymalı Pide',
  'mekan:Wok & Noodle',
  'mekan:Tatlı & Waffle',
  'mekan:Mantı & Ev Yemekleri',
  'mekan:İskender & Bursa Kebabı',
  'mekan:Çiğ Köfte & Dürüm',
  'mekan:Kumpir',
  'mekan:Kokoreç & Midye',
  'mekan:Baklava & Katmer',
  'mekan:Simit & Çay',
  'mekan:Gözleme & Ayran',
  'mekan:Menemen & Kahvaltı',
  'mekan:Meze & Balık',
  'mekan:Çorba & Esnaf Lokantası',
  'mekan:Tavuk Döner & Pilav',
  'mekan:Cheesecake & Kahve',
]);

const TURKISH_CHARACTERS = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
};

export const catalogAssetSlug = (name = '') => name
  .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (character) => TURKISH_CHARACTERS[character] || character)
  .toLocaleLowerCase('en-US')
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Vercel'e repoyla birlikte gönderilen, kontrol edilmiş katalog görselleri.
// Adminin sonradan verdiği bir URL bu katmanda ezilmez; yalnızca varsayılan
// Unsplash/Pexels kaynakları statik kopyaya geçirilir.
export const getStaticCatalogImageUrl = (category, name, sourceUrl) => {
  const slug = catalogAssetSlug(name);
  if (!slug) return null;

  if (GENERATED_CATALOG_ASSETS.has(`${category}:${name}`)) {
    return `/catalog/${category}/${slug}.jpg?v=${CATALOG_ASSET_VERSION}`;
  }

  try {
    const hostname = new URL(sourceUrl).hostname;
    if (!STATIC_IMAGE_HOSTS.has(hostname)) return null;
    return `/catalog/${category}/${slug}.jpg?v=${CATALOG_ASSET_VERSION}`;
  } catch {
    return null;
  }
};

export const isStaticCatalogImageSource = (sourceUrl) => Boolean(
  getStaticCatalogImageUrl('mekan', 'catalog', sourceUrl)
);
