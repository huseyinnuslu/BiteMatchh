import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, Shield, UserCircle, MessageSquare, History } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

// ---- Navbar ----
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame color="var(--primary)" size={isMobile ? 24 : 28} />
            <h2 className="text-gradient" style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem' }}>BiteMatch</h2>
          </Link>

          {/* Masaüstü Menü Linkleri (Mobilde tamamen gizli) */}
          {user && user._id && !isMobile && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}>
              <Link to="/dashboard" className="btn btn-outline" style={{
                padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem',
                borderColor: location.pathname === '/dashboard' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: location.pathname === '/dashboard' ? 'var(--primary)' : 'white'
              }}>
                <LayoutDashboard size={14} /> Keşfet
              </Link>
              <Link to="/history" className="btn btn-outline" style={{
                padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem',
                borderColor: location.pathname === '/history' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: location.pathname === '/history' ? 'white' : 'white'
              }}>
                <History size={14} style={{ color: location.pathname === '/history' ? 'var(--primary)' : 'var(--primary)' }} /> Geçmişim
              </Link>
              <Link to="/messages" className="btn btn-outline" style={{
                padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem',
                borderColor: location.pathname === '/messages' ? 'var(--primary)' : 'rgba(99,102,241,0.5)',
                color: location.pathname === '/messages' ? 'var(--primary)' : 'var(--primary)'
              }}>
                <MessageSquare size={14} /> Mesajlar
              </Link>
              <Link to="/profile" className="btn btn-outline" style={{
                padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem',
                borderColor: location.pathname === '/profile' ? 'var(--primary)' : 'var(--accent)',
                color: location.pathname === '/profile' ? 'var(--primary)' : 'var(--accent)'
              }}>
                <UserCircle size={14} /> Profilim
              </Link>
              {user.role === 'Admin' && (
                <Link to="/admin" className="btn btn-outline" style={{
                  padding: '0.5rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem',
                  borderColor: location.pathname === '/admin' ? 'var(--primary)' : '#ff6b6b',
                  color: location.pathname === '/admin' ? 'var(--primary)' : '#ff6b6b'
                }}>
                  <Shield size={14} /> Admin
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
                  marginLeft: '0.5rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
              >
                <LogOut size={15} /> Çıkış
              </button>
            </div>
          )}

          {/* Mobilde sağ tarafta Çıkış Butonu */}
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

          {/* Giriş Yapılmamışsa Linkler */}
          {(!user || !user._id) && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link to="/login" className="btn" style={{ background: 'transparent', color: 'white' }}>Giriş Yap</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Kayıt Ol</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobil Alt Navigasyon Barı (Mobile Bottom Navigation Bar) */}
      {isMobile && user && user._id && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '0.6rem 0', zIndex: 1000,
          boxShadow: '0 -4px 25px rgba(0,0,0,0.5)',
        }}>
          <Link to="/dashboard" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <LayoutDashboard size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Keşfet</span>
          </Link>
          
          <Link to="/history" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/history' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <History size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Geçmişim</span>
          </Link>

          <Link to="/messages" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/messages' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <MessageSquare size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Mesajlar</span>
          </Link>

          <Link to="/profile" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/profile' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <UserCircle size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Profilim</span>
          </Link>

          {user.role === 'Admin' && (
            <Link to="/admin" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              textDecoration: 'none',
              color: location.pathname === '/admin' ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
              <Shield size={20} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Admin</span>
            </Link>
          )}
        </div>
      )}

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
