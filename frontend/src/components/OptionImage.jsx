import { useEffect, useState } from 'react';
import { Clapperboard, ImageOff, UtensilsCrossed } from 'lucide-react';

const OptionImage = ({ src, alt, category, isLive, children }) => {
  const [state, setState] = useState(src ? 'loading' : 'error');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState(src ? 'loading' : 'error');
    setAttempt(0);
  }, [src]);

  // Mobil ağlarda haricî görsel isteği bazen hata döndürmeden beklemede
  // kalabiliyor. Kartı sonsuza kadar "yükleniyor" durumunda bırakmak yerine
  // aynı kaynaktan bir kez taze istek yapıp ardından açık hata durumu gösteririz.
  useEffect(() => {
    if (!src || state !== 'loading') return undefined;
    const timeout = window.setTimeout(() => {
      if (attempt === 0) setAttempt(1);
      else setState('error');
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [src, state, attempt]);

  const retryOrFail = () => {
    if (attempt === 0) setAttempt(1);
    else setState('error');
  };
  const imageSrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}bitematch_retry=1`;

  const isFilm = category === 'film' || category === 'movie';
  const Icon = isFilm ? Clapperboard : UtensilsCrossed;

  return (
    <div style={{
      height: '55%', width: '100%', position: 'relative', overflow: 'hidden',
      background: isLive
        ? 'linear-gradient(135deg, #3b0d18, #0f172a 72%)'
        : isFilm
          ? 'linear-gradient(135deg, #1e1b4b, #0f172a 72%)'
          : 'linear-gradient(135deg, #3f1d2e, #0f172a 72%)',
    }}>
      {src && state !== 'error' && (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={alt}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState('loaded')}
          onError={retryOrFail}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: state === 'loaded' ? 1 : 0, transition: 'opacity .2s ease',
          }}
        />
      )}

      {state !== 'loaded' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.82)' }}>
          <div style={{ display: 'grid', placeItems: 'center', gap: '.5rem', textAlign: 'center' }}>
            {state === 'loading' ? <Icon size={38} strokeWidth={1.5} /> : <ImageOff size={34} strokeWidth={1.5} />}
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(255,255,255,.72)' }}>
              {state === 'loading' ? 'Görsel yükleniyor' : 'Görsel şu anda yüklenemedi'}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default OptionImage;
