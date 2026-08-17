import { useEffect, useMemo, useState } from 'react';
import { resolveAssetUrl } from '../utils/imageCache';

const OptionImage = ({ src, alt, category, isLive, children }) => {
  const isFilm = category === 'film' || category === 'movie';
  const isActivity = category === 'aktivite' || category === 'activity';
  const fallbackSrc = isFilm ? '/film-card-fallback.svg' : isActivity ? '/activity-card-fallback.svg' : '/food-card-fallback.svg';
  const sourceUrl = useMemo(() => resolveAssetUrl(src), [src]);
  const fallbackUrl = useMemo(() => resolveAssetUrl(fallbackSrc), [fallbackSrc]);
  const [imageSrc, setImageSrc] = useState(sourceUrl || fallbackUrl);

  useEffect(() => {
    setImageSrc(sourceUrl || fallbackUrl);
  }, [sourceUrl, fallbackUrl]);

  const useFallback = () => {
    if (imageSrc !== fallbackUrl) setImageSrc(fallbackUrl);
  };

  return (
    <div style={{ height: '55%', width: '100%', position: 'relative', overflow: 'hidden', background: isLive ? 'linear-gradient(135deg, #3b0d18, #0f172a 72%)' : isFilm ? 'linear-gradient(135deg, #1e1b4b, #0f172a 72%)' : 'linear-gradient(135deg, #3f1d2e, #0f172a 72%)' }}>
      <img key={imageSrc} src={imageSrc} alt={alt} loading="eager" fetchPriority="high" decoding="sync" onError={useFallback} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {children}
    </div>
  );
};

export default OptionImage;
