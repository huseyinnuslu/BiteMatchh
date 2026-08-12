import React from 'react';

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
        {isImage ? (
          <img 
            src={getImageUrl(src)} 
            alt={username} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', imageRendering: 'auto' }}
            // Avatarlar küçük ancak profilin kimlik öğesi. Mobil tarayıcının
            // bunları görünür olduktan sonra ertelemesini istemiyoruz.
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span style={{ display: isImage ? 'none' : 'flex' }}>
          {initial}
        </span>
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
