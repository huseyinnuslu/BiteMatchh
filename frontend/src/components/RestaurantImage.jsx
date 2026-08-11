import { useEffect, useState } from 'react';

const LOCAL_RESTAURANT_FALLBACK = '/restaurant-placeholder.svg';

const RestaurantImage = ({ item, alt, containerStyle, imageStyle, badgeStyle }) => {
  const [src, setSrc] = useState(item?.imageUrl || item?.fallbackImageUrl || '');
  const [isRepresentative, setIsRepresentative] = useState(!!item?.imageIsRepresentative);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src || loaded || src === LOCAL_RESTAURANT_FALLBACK) return undefined;
    const timeout = window.setTimeout(() => {
      setSrc(LOCAL_RESTAURANT_FALLBACK);
      setIsRepresentative(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [src, loaded]);

  if (!src) return null;

  const handleError = () => {
    if (!isRepresentative && item?.fallbackImageUrl && src !== item.fallbackImageUrl) {
      setSrc(item.fallbackImageUrl);
      setIsRepresentative(true);
      setLoaded(false);
      return;
    }
    if (src !== LOCAL_RESTAURANT_FALLBACK) {
      setSrc(LOCAL_RESTAURANT_FALLBACK);
      setIsRepresentative(true);
      setLoaded(false);
      return;
    }
    setSrc('');
  };

  return (
    <div style={{ overflow: 'hidden', position: 'relative', ...containerStyle }}>
      <img src={src} alt={alt} onLoad={() => setLoaded(true)} onError={handleError} style={{ width: '100%', height: '100%', objectFit: 'cover', ...imageStyle }} />
    </div>
  );
};

export default RestaurantImage;
