import { useEffect, useMemo, useState } from 'react';
import { getImageStatus, preloadImage, resolveAssetUrl } from '../utils/imageCache';

const LOCAL_RESTAURANT_FALLBACK = '/restaurant-placeholder.svg';

const RestaurantImage = ({ item, alt, containerStyle, imageStyle }) => {
  const primaryUrl = useMemo(() => resolveAssetUrl(item?.imageUrl || item?.fallbackImageUrl || ''), [item?.imageUrl, item?.fallbackImageUrl]);
  const fallbackUrl = useMemo(() => resolveAssetUrl(item?.fallbackImageUrl || LOCAL_RESTAURANT_FALLBACK), [item?.fallbackImageUrl]);
  const localFallbackUrl = useMemo(() => resolveAssetUrl(LOCAL_RESTAURANT_FALLBACK), []);
  const [src, setSrc] = useState(primaryUrl);
  const [loaded, setLoaded] = useState(() => getImageStatus(primaryUrl) === 'loaded');

  useEffect(() => {
    setSrc(primaryUrl);
    setLoaded(getImageStatus(primaryUrl) === 'loaded');
  }, [primaryUrl]);

  const moveToFallback = () => {
    if (src !== fallbackUrl) { setSrc(fallbackUrl); setLoaded(getImageStatus(fallbackUrl) === 'loaded'); return; }
    if (src !== localFallbackUrl) { setSrc(localFallbackUrl); setLoaded(getImageStatus(localFallbackUrl) === 'loaded'); return; }
    setSrc('');
  };

  useEffect(() => {
    if (!src) return undefined;
    let active = true;
    preloadImage(src).then((nextStatus) => {
      if (!active) return;
      if (nextStatus === 'loaded') setLoaded(true);
      else moveToFallback();
    });
    return () => { active = false; };
  // A source update must start a fresh preload; fallback handling deliberately uses latest src.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!src) return null;
  return <div style={{ overflow: 'hidden', position: 'relative', background: 'var(--surface)', ...containerStyle }}><img src={src} alt={alt} loading="eager" fetchPriority="high" decoding="async" onLoad={() => setLoaded(true)} onError={moveToFallback} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity .14s ease', ...imageStyle }} /></div>;
};

export default RestaurantImage;
