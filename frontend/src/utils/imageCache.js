// Uygulama genelinde aynı görsel için tek bir Image isteği açılır. Böylece
// mesajlar/geçmiş/oda arasında geçişte bileşenler tekrar tekrar "yükleniyor"
// durumuna dönmez; tarayıcı önbelleğindeki hazır dosya anında kullanılır.
const imageStatus = new Map();
const pendingLoads = new Map();

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

  const request = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* decode desteği olmayan tarayıcılar */ }
      imageStatus.set(resolvedUrl, 'loaded');
      pendingLoads.delete(resolvedUrl);
      resolve('loaded');
    };
    image.onerror = () => {
      imageStatus.set(resolvedUrl, 'error');
      pendingLoads.delete(resolvedUrl);
      resolve('error');
    };
    image.src = resolvedUrl;
  });
  pendingLoads.set(resolvedUrl, request);
  return request;
};

export const preloadImages = (urls) => Promise.all([...new Set((urls || []).filter(Boolean))].map(preloadImage));
