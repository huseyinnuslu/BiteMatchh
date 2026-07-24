/**
 * ConfirmModal Bileşeni
 * Kullanıcıdan onay gerektiren işlemler için özel tasarımlı modal.
 * Props:
 *   - icon: Emoji veya metin (string)
 *   - title: Modal başlığı
 *   - message: Açıklama metni
 *   - confirmText: Onay butonu metni
 *   - confirmColor: Onay butonunun rengi (HEX)
 *   - onConfirm: Onaylandığında çalışan fonksiyon
 *   - onCancel: İptal edildiğinde çalışan fonksiyon
 */
const ConfirmModal = ({
  icon = '⚠️',
  title = 'Emin misiniz?',
  message,
  confirmText = 'Onayla',
  confirmColor = '#ef4444',
  onConfirm,
  onCancel,
}) => {
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.99) 0%, rgba(30,27,75,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          maxWidth: '380px',
          margin: '1rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* İkon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          margin: '0 auto 1.25rem',
          background: `${confirmColor}18`,
          border: `2px solid ${confirmColor}44`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.6rem',
        }}>
          {icon}
        </div>

        {/* Başlık */}
        <h3 style={{
          textAlign: 'center', margin: '0 0 0.5rem',
          fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)',
        }}>
          {title}
        </h3>

        {/* Açıklama */}
        <p style={{
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: '0.875rem', margin: '0 0 1.75rem', lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.7rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-muted)', fontWeight: 600,
              fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '0.7rem', borderRadius: '10px',
              background: `linear-gradient(135deg, ${confirmColor}, ${confirmColor}cc)`,
              border: 'none', color: '#fff', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: `0 4px 15px ${confirmColor}44`,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  , document.body);
};

export default ConfirmModal;
import { createPortal } from 'react-dom';
