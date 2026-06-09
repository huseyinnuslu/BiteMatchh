/**
 * LoadingSpinner Bileşeni
 * Yükleme durumlarında gösterilen animasyonlu döndürme simgesi.
 * Props:
 *   - size: piksel boyutu (varsayılan: 40)
 *   - text: altında gösterilecek metin (isteğe bağlı)
 *   - fullPage: true ise sayfayı ortalar
 */
const LoadingSpinner = ({ size = 40, text = '', fullPage = false }) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid rgba(255,255,255,0.1)`,
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      {text && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        zIndex: 9000,
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
