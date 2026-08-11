import { useEffect, useState } from 'react';
import { Clapperboard, UtensilsCrossed } from 'lucide-react';

const OptionImage = ({ src, alt, category, isLive, children }) => {
  const isFilm = category === 'film' || category === 'movie';
  const isActivity = category === 'aktivite' || category === 'activity';
  const fallbackSrc = isFilm ? '/film-card-fallback.svg' : isActivity ? '/activity-card-fallback.svg' : '/food-card-fallback.svg';
  const [state, setState] = useState(src ? 'loading' : 'loaded');
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setState(src ? 'loading' : 'loaded');
    setImageSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  // Dış kaynak mobil ağda hata verse veya uzun süre yanıt vermese bile kart
  // uygulama içindeki kategori görseline geçer; boş/hata kartı gösterilmez.
  useEffect(() => {
    if (!src || state !== 'loading' || imageSrc === fallbackSrc) return undefined;
    const timeout = window.setTimeout(() => {
      setImageSrc(fallbackSrc);
      setState('loading');
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [src, state, imageSrc, fallbackSrc]);

  const useFallback = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setState('loading');
    }
  };

  const Icon = isFilm ? Clapperboard : UtensilsCrossed;

  return (
    <div style={{
      height: '55%', width: '100%', position: 'relative', overflow: 'hidden',
      background: isLive
        ? 'linear-gradient(135deg, #3b0d18, #0f172a 72%)'
        : isFilm ? 'linear-gradient(135deg, #1e1b4b, #0f172a 72%)'
          : 'linear-gradient(135deg, #3f1d2e, #0f172a 72%)',
    }}>
      <img
        key={imageSrc}
        src={imageSrc}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setState('loaded')}
        onError={useFallback}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: state === 'loaded' ? 1 : 0, transition: 'opacity .2s ease',
        }}
      />

      {state !== 'loaded' && imageSrc !== fallbackSrc && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.82)' }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: '.5rem', textAlign: 'center' }}>
            <Icon size={38} strokeWidth={1.5} />
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(255,255,255,.72)' }}>Görsel hazırlanıyor</span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default OptionImage;
