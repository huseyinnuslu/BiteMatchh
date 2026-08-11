import { useState } from 'react';

const LOCAL_RESTAURANT_FALLBACK = '/restaurant-placeholder.svg';

const RestaurantImage = ({ item, alt, containerStyle, imageStyle, badgeStyle }) => {
  const [src, setSrc] = useState(item?.imageUrl || item?.fallbackImageUrl || '');
  const [isRepresentative, setIsRepresentative] = useState(!!item?.imageIsRepresentative);

  if (!src) return null;

  const handleError = () => {
    if (!isRepresentative && item?.fallbackImageUrl && src !== item.fallbackImageUrl) {
      setSrc(item.fallbackImageUrl);
      setIsRepresentative(true);
      return;
    }
    if (src !== LOCAL_RESTAURANT_FALLBACK) {
      setSrc(LOCAL_RESTAURANT_FALLBACK);
      setIsRepresentative(true);
      return;
    }
    setSrc('');
  };

  return (
    <div style={{ overflow: 'hidden', position: 'relative', ...containerStyle }}>
      <img src={src} alt={alt} onError={handleError} style={{ width: '100%', height: '100%', objectFit: 'cover', ...imageStyle }} />
    </div>
  );
};

export default RestaurantImage;
