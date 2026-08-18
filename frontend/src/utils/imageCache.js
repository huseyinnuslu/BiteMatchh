// Uygulama genelinde aynı görsel için tek bir arka plan isteği açılır.
// Bu yardımcı, ekrandaki <img> etiketini GECİKTİRMEZ: görünür görseller
// tarayıcı tarafından doğrudan çizilir; burada sadece sonraki kartları sıcak
// tutmak için sınırlı sayıda istek kuyruğa alınır.
const imageStatus = new Map();
const pendingLoads = new Map();
const preloadQueue = [];
let activePreloads = 0;
const MAX_CONCURRENT_PRELOADS = 4;

export const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL || 'https://bitematchh.onrender.com').replace(/\/$/, '').replace(/\/api$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getImageStatus = (url) => imageStatus.get(resolveAssetUrl(url));

export const preloadImage = (url) => {
  const resolvedUrl = resolveAssetUrl(url);
  if (!resolvedUrl) return Promise.resolve('error');
  const known = imageStatus.get(resolvedUrl);
  if (known) return Promise.resolve(known);
  if (pendingLoads.has(resolvedUrl)) return pendingLoads.get(resolvedUrl);

  let resolveRequest;
  const request = new Promise((resolve) => { resolveRequest = resolve; });
  pendingLoads.set(resolvedUrl, request);
  preloadQueue.push({ resolvedUrl, resolve: resolveRequest });
  runPreloadQueue();
  return request;
};

const runPreloadQueue = () => {
  while (activePreloads < MAX_CONCURRENT_PRELOADS && preloadQueue.length) {
    const next = preloadQueue.shift();
    activePreloads += 1;
    const image = new Image();
    // Ön-yükleme işlemi görünür kartların kaynaklarını işgal etmesin.
    image.decoding = 'async';
    image.onload = () => finishPreload(next.resolvedUrl, next.resolve, 'loaded');
    image.onerror = () => finishPreload(next.resolvedUrl, next.resolve, 'error');
    image.src = next.resolvedUrl;
  }
};

const finishPreload = (url, resolve, status) => {
  imageStatus.set(url, status);
  pendingLoads.delete(url);
  activePreloads = Math.max(0, activePreloads - 1);
  resolve(status);
  runPreloadQueue();
};

export const preloadImages = (urls) => Promise.all(
  [...new Set((urls || []).filter(Boolean))].map(preloadImage)
);
