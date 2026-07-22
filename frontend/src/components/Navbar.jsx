import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, Shield, UserCircle, MessageSquare, History, Bell } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { getSocket } from '../socket/socketClient';
import api from '../api';

// ---- Navbar ----
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user?._id) return;
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch (err) { console.error('Bildirimler alınamadı', err); }
    };
    fetchNotifs();

    // Socket listener
    const socket = getSocket();
    if (socket) {
      socket.on('new_notification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
      });
    }

    return () => {
      if (socket) socket.off('new_notification');
    };
  }, [user?._id]);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const handleNotificationClick = async (notif) => {
    setShowNotifications(false);
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (err) { console.error(err); }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
                borderColor: location.pathname === '/profile' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: location.pathname === '/profile' ? 'var(--primary)' : 'white'
              }}>
                <UserCircle size={14} /> Profil
              </Link>

              {/* Bildirim Çanı (Desktop) */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'white', position: 'relative'
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px', background: 'var(--primary)',
                      color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '16px', height: '16px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: 'absolute', top: '120%', right: 0, width: '300px',
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000,
                    maxHeight: '400px', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: 'white' }}>Bildirimler</h4>
                      {unreadCount > 0 && (
                        <span onClick={markAllAsRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Tümünü Okundu İşaretle</span>
                      )}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hiç bildiriminiz yok.</div>
                      ) : (
                        notifications.map(n => (
                          <Link 
                            key={n._id} to={n.link || '#'}
                            onClick={() => handleNotificationClick(n)}
                            style={{ 
                              display: 'block', padding: '0.75rem 1rem', textDecoration: 'none',
                              background: n.isRead ? 'transparent' : 'rgba(255, 107, 107, 0.05)',
                              borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--primary)',
                              transition: 'background 0.2s'
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.2rem' }}>{n.message}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString('tr-TR')}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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
