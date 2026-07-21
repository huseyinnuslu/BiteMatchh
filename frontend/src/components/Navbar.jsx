import { Link } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, Shield, UserCircle, MessageSquare, History } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// ---- Navbar ----
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <nav style={{
        padding: isMobile ? '0.75rem 0' : '1rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div className="container" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '0.75rem' : '0',
        }}>
          {/* Logo ve Çıkış (Mobil görünüm için üst satır) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame color="var(--primary)" size={isMobile ? 24 : 28} />
              <h2 className="text-gradient" style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem' }}>BiteMatch</h2>
            </Link>

            {isMobile && user && user._id && (
              <button
                onClick={() => setShowLogoutModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.8rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontWeight: 600, fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={13} /> Çıkış
              </button>
            )}
          </div>

          {/* Menü Linkleri (Mobil için yatay kaydırılabilir alt satır) */}
          {user && user._id ? (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              overflowX: isMobile ? 'auto' : 'visible',
              paddingBottom: isMobile ? '0.25rem' : '0',
              // Kaydırma çubuklarını gizleme
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              width: isMobile ? '100vw' : 'auto',
              marginLeft: isMobile ? 'calc(50% - 50vw)' : '0',
              paddingLeft: isMobile ? '1.5rem' : '0',
              paddingRight: isMobile ? '1.5rem' : '0',
              boxSizing: 'border-box',
            }}>
              <style>{`
                /* Webkit scrollbar gizleme */
                div::-webkit-scrollbar {
                  display: none !important;
                }
              `}</style>
              
              <Link to="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', flexShrink: 0 }}>
                <LayoutDashboard size={14} /> Keşfet
              </Link>
              <Link to="/history" className="btn btn-outline" style={{ padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem', flexShrink: 0 }}>
                <History size={14} style={{ color: 'var(--primary)' }} /> Geçmişim
              </Link>
              <Link to="/messages" className="btn btn-outline" style={{ padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(99,102,241,0.5)', color: 'var(--primary)', fontSize: '0.82rem', flexShrink: 0 }}>
                <MessageSquare size={14} /> Mesajlar
              </Link>
              <Link to="/profile" className="btn btn-outline" style={{ padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--accent)', color: 'var(--accent)', fontSize: '0.82rem', flexShrink: 0 }}>
                <UserCircle size={14} /> Profilim
              </Link>
              {user.role === 'Admin' && (
                <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 0.9rem', borderColor: '#ff6b6b', color: '#ff6b6b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', flexShrink: 0 }}>
                  <Shield size={14} /> Admin
                </Link>
              )}

              {!isMobile && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    marginLeft: '0.5rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                >
                  <LogOut size={15} /> Çıkış
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link to="/login" className="btn" style={{ background: 'transparent', color: 'white' }}>Giriş Yap</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Kayıt Ol</Link>
            </div>
          )}
        </div>
      </nav>

      {showLogoutModal && (
        <ConfirmModal
          icon={<LogOut size={26} color="#f87171" />}
          title="Çıkış Yap"
          message="BiteMatch hesabınızdan çıkış yapmak istediğinize emin misiniz?"
          confirmText="Çıkış Yap"
          confirmColor="#ef4444"
          onConfirm={() => { logout(); setShowLogoutModal(false); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

export default Navbar;
