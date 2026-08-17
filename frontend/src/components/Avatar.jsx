import React, { useEffect, useMemo, useState } from 'react';
import { resolveAssetUrl } from '../utils/imageCache';

const Avatar = ({ src, username = '?', size = 40, online = false }) => {
  const imageUrl = useMemo(() => resolveAssetUrl(src), [src]);
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const [hasError, setHasError] = useState(!imageUrl);

  useEffect(() => {
    setHasError(!imageUrl);
  }, [imageUrl]);

  const avatarStyle = {
    width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: size * 0.45 + 'px', background: imageUrl ? 'var(--card-bg)' : 'linear-gradient(135deg, var(--primary), #d946ef)',
    color: '#fff', flexShrink: 0, position: 'relative', overflow: 'hidden',
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={avatarStyle}>
        <span style={{ display: 'flex' }}>{initial}</span>
        {imageUrl && !hasError && (
          <img
            src={imageUrl} alt={username} loading="eager" fetchPriority="high" decoding="sync"
            onError={() => setHasError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', imageRendering: 'auto', position: 'absolute', inset: 0, display: 'block' }}
          />
        )}
      </div>
      {online && <span style={{ position: 'absolute', bottom: 2, right: 2, width: Math.max(10, size * 0.25), height: Math.max(10, size * 0.25), background: '#22c55e', border: '2px solid #111', borderRadius: '50%', zIndex: 2 }} />}
    </div>
  );
};

export default Avatar;
