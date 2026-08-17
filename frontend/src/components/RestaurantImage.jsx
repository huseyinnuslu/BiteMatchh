import { useEffect, useMemo, useState } from 'react';
import { resolveAssetUrl } from '../utils/imageCache';

const LOCAL_RESTAURANT_FALLBACK = '/restaurant-placeholder.svg';

const RestaurantImage = ({ item, alt, containerStyle, imageStyle }) => {
  const primaryUrl = useMemo(() => resolveAssetUrl(item?.imageUrl || item?.fallbackImageUrl || ''), [item?.imageUrl, item?.fallbackImageUrl]);
  const fallbackUrl = useMemo(() => resolveAssetUrl(item?.fallbackImageUrl || LOCAL_RESTAURANT_FALLBACK), [item?.fallbackImageUrl]);
  const localFallbackUrl = useMemo(() => resolveAssetUrl(LOCAL_RESTAURANT_FALLBACK), []);
  const [src, setSrc] = useState(primaryUrl);

  useEffect(() => {
    setSrc(primaryUrl);
  }, [primaryUrl]);

  const moveToFallback = () => {
    if (src !== fallbackUrl) { setSrc(fallbackUrl); return; }
    if (src !== localFallbackUrl) { setSrc(localFallbackUrl); return; }
    setSrc('');
  };

  if (!src) return null;
  return <div style={{ overflow: 'hidden', position: 'relative', background: 'var(--surface)', ...containerStyle }}><img src={src} alt={alt} loading="eager" fetchPriority="high" decoding="sync" onError={moveToFallback} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...imageStyle }} /></div>;
};

export default RestaurantImage;
