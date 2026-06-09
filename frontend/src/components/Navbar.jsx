import { Link } from 'react-router-dom';
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, Shield } from 'lucide-react';

// ---- Özel Çıkış Onay Modali ----
const LogoutModal = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.15s ease',
  }}>
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.98) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '2rem',
      width: '100%',
      maxWidth: '360px',
      margin: '1rem',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.2s ease',
    }}>
      {/* İkon */}
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1.25rem',
        background: 'rgba(239,68,68,0.12)',
        border: '2px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LogOut size={26} color="#f87171" />
      </div>

      {/* Başlık */}
      <h3 style={{ textAlign: 'center', margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
        Çıkış Yap
      </h3>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        BiteMatch hesabınızdan çıkış yapmak istediğinize emin misiniz?
      </p>

      {/* Butonlar */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.7rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          İptal
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '0.7rem', borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(239,68,68,0.35)',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  </div>
);

// ---- Navbar ----
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <nav style={{
        padding: '1rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div className="container flex-center" style={{ justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame color="var(--primary)" size={28} />
            <h2 className="text-gradient" style={{ margin: 0 }}>BiteMatch</h2>
          </Link>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LayoutDashboard size={15} /> Dashboard
                </Link>
                {user.role === 'Admin' && (
                  <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderColor: '#ff6b6b', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={15} /> Admin
                  </Link>
                )}
                <button
                  onClick={() => setShowLogoutModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                >
                  <LogOut size={15} /> Çıkış
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn" style={{ background: 'transparent', color: 'white' }}>Giriş Yap</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Kayıt Ol</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => { logout(); setShowLogoutModal(false); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

export default Navbar;
