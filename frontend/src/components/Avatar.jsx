import React, { useEffect, useMemo, useState } from 'react';

const Avatar = ({ src, username = '?', size = 40, online = false }) => {
  const isImage = Boolean(src);
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  
  // URL düzeltme
  const getImageUrl = (url) => {
    if (url.startsWith('http')) return url;
    // vite env yoksa varsayılan olarak API host'u varsayalım
    const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://bitematchh.onrender.com';
    return `${baseUrl}${url}`;
  };

  const imageUrl = useMemo(() => (isImage ? getImageUrl(src) : ''), [src, isImage]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    if (!imageUrl) return undefined;

    // Aynı avatarın sayfadaki diğer kullanımlarını tarayıcı önbelleğine mümkün
    // olan en erken anda alır. Navbar, mesajlar ve arkadaş listesi aynı dosyayı
    // ikinci kez beklemez.
    const preload = new Image();
    preload.src = imageUrl;
    preload.onload = () => setIsLoaded(true);
    preload.onerror = () => setHasError(true);
    return () => {
      preload.onload = null;
      preload.onerror = null;
    };
  }, [imageUrl]);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: size * 0.45 + 'px',
    background: isImage ? 'var(--card-bg)' : 'linear-gradient(135deg, var(--primary), #d946ef)',
    color: '#fff',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={avatarStyle}>
        {/* Fotoğraf ağdan gelirken boş/koyu bir daire bırakmıyoruz: rozet anında
            görünür, görsel hazır olduğunda kısa ve titreşimsiz biçimde üstüne gelir. */}
        <span style={{ display: isLoaded && !hasError ? 'none' : 'flex' }}>
          {initial}
        </span>
        {isImage && !hasError ? (
          <img 
            src={imageUrl}
            alt={username} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', imageRendering: 'auto', position: 'absolute', inset: 0, opacity: isLoaded ? 1 : 0, transition: 'opacity 120ms ease-out' }}
            // Avatarlar küçük ancak profilin kimlik öğesi. Mobil tarayıcının
            // bunları görünür olduktan sonra ertelemesini istemiyoruz.
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        ) : null}
      </div>
      {online && (
        <span style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: Math.max(10, size * 0.25),
          height: Math.max(10, size * 0.25),
          background: '#22c55e',
          border: '2px solid #111',
          borderRadius: '50%',
          zIndex: 2
        }} />
      )}
    </div>
  );
};

export default Avatar;
