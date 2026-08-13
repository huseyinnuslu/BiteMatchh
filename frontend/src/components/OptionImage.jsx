import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, UtensilsCrossed } from 'lucide-react';
import { getImageStatus, preloadImage, resolveAssetUrl } from '../utils/imageCache';

const OptionImage = ({ src, alt, category, isLive, children }) => {
  const isFilm = category === 'film' || category === 'movie';
  const isActivity = category === 'aktivite' || category === 'activity';
  const fallbackSrc = isFilm ? '/film-card-fallback.svg' : isActivity ? '/activity-card-fallback.svg' : '/food-card-fallback.svg';
  const sourceUrl = useMemo(() => resolveAssetUrl(src), [src]);
  const fallbackUrl = useMemo(() => resolveAssetUrl(fallbackSrc), [fallbackSrc]);
  const [imageSrc, setImageSrc] = useState(sourceUrl || fallbackUrl);
  const [state, setState] = useState(() => sourceUrl ? (getImageStatus(sourceUrl) || 'loading') : 'loaded');

  useEffect(() => {
    setImageSrc(sourceUrl || fallbackUrl);
    setState(sourceUrl ? (getImageStatus(sourceUrl) || 'loading') : 'loaded');
  }, [sourceUrl, fallbackUrl]);

  useEffect(() => {
    if (!sourceUrl) return undefined;
    let active = true;
    preloadImage(sourceUrl).then((nextState) => {
      if (!active) return;
      if (nextState === 'loaded') setState('loaded');
      else { setImageSrc(fallbackUrl); setState('loading'); }
    });
    return () => { active = false; };
  }, [sourceUrl, fallbackUrl]);

  const useFallback = () => {
    if (imageSrc !== fallbackUrl) { setImageSrc(fallbackUrl); setState('loading'); }
  };
  const Icon = isFilm ? Clapperboard : UtensilsCrossed;

  return (
    <div style={{ height: '55%', width: '100%', position: 'relative', overflow: 'hidden', background: isLive ? 'linear-gradient(135deg, #3b0d18, #0f172a 72%)' : isFilm ? 'linear-gradient(135deg, #1e1b4b, #0f172a 72%)' : 'linear-gradient(135deg, #3f1d2e, #0f172a 72%)' }}>
      <img key={imageSrc} src={imageSrc} alt={alt} loading="eager" fetchPriority="high" decoding="async" onLoad={() => setState('loaded')} onError={useFallback} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: state === 'loaded' ? 1 : 0, transition: 'opacity .14s ease' }} />
      {state !== 'loaded' && imageSrc !== fallbackUrl && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.82)' }}><div style={{ display: 'grid', placeItems: 'center', gap: '.5rem', textAlign: 'center' }}><Icon size={38} strokeWidth={1.5} /><span style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(255,255,255,.72)' }}>Görsel hazırlanıyor</span></div></div>}
      {children}
    </div>
  );
};

export default OptionImage;
