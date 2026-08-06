import { useState } from 'react';

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
    setSrc('');
  };

  const badge = (
    <span style={{
      position: 'absolute', left: 8, bottom: 8,
      padding: '.25rem .5rem', borderRadius: 7,
      background: 'rgba(2,6,23,.82)', color: '#e2e8f0',
      fontSize: '.68rem', fontWeight: 700,
      ...badgeStyle,
    }}>
      {isRepresentative ? 'Temsili görsel' : item.imageAttribution || 'Görsel kaynağı'}
    </span>
  );

  return (
    <div style={{ overflow: 'hidden', position: 'relative', ...containerStyle }}>
      <img src={src} alt={alt} onError={handleError} style={{ width: '100%', height: '100%', objectFit: 'cover', ...imageStyle }} />
      {!isRepresentative && item?.imageSourceUrl ? (
        <a href={item.imageSourceUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{badge}</a>
      ) : badge}
    </div>
  );
};

export default RestaurantImage;
