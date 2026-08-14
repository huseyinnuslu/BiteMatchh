import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { RoomContext } from '../context/RoomContext';
import { Flame, LogOut, LayoutDashboard, Shield, UserCircle, MessageSquare, History, Bell, X, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { getSocket } from '../socket/socketClient';
import api from '../api';
import { toast } from 'react-toastify';
import Avatar from './Avatar';

const NotificationItem = ({ notification, onOpen, onDelete, mobile = false }) => {
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const touchStart = useRef(null);

  const handleTouchStart = (event) => {
    if (!mobile) return;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const handleTouchEnd = (event) => {
    if (!mobile || !touchStart.current) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    // Sadece belirgin yatay sola kaydırmayı silme hareketi sayıyoruz;
    // bildirim listesinin normal dikey kaydırmasını engellemez.
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -56) {
      setDeleteRevealed(true);
    } else if (deltaX > 24) {
      setDeleteRevealed(false);
    }
  };

  const openNotification = () => {
    if (deleteRevealed) {
      setDeleteRevealed(false);
      return;
    }
    onOpen(notification);
  };

  const removeNotification = (event) => {
    event.stopPropagation();
    onDelete(notification);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
      {mobile && (
        <button
          type="button"
          onClick={removeNotification}
          aria-label="Bildirimi sil"
          style={{
            position: 'absolute', inset: 0, left: 'auto', width: '82px', border: 0,
            background: '#dc3f4c', color: 'white', cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.18rem',
            fontSize: '0.66rem', fontWeight: 700,
          }}
        >
          <Trash2 size={17} /> Sil
        </button>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={openNotification}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openNotification();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative', zIndex: 1, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
          padding: mobile ? '0.65rem 0.9rem' : '0.75rem 0.8rem 0.75rem 1rem',
          background: notification.isRead ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 107, 107, 0.075)',
          borderLeft: notification.isRead ? '3px solid transparent' : '3px solid var(--primary)',
          transform: mobile && deleteRevealed ? 'translateX(-82px)' : 'translateX(0)',
          transition: 'transform 0.2s ease, background 0.2s ease', touchAction: 'pan-y',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: mobile ? '0.8rem' : '0.85rem', color: 'white', marginBottom: '0.2rem', lineHeight: 1.35 }}>{notification.message}</div>
          <div style={{ fontSize: mobile ? '0.65rem' : '0.7rem', color: 'var(--text-muted)' }}>{new Date(notification.createdAt).toLocaleDateString('tr-TR')}</div>
        </div>
        {!mobile && (
          <button
            type="button"
            onClick={removeNotification}
            aria-label="Bildirimi sil"
            title="Bildirimi sil"
            style={{
              flexShrink: 0, border: 0, background: 'transparent', color: 'var(--text-muted)', padding: '0.18rem',
              cursor: 'pointer', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// ---- Navbar ----
const Navbar = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { currentRoom, resetRoom } = useContext(RoomContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRoomNavigation, setPendingRoomNavigation] = useState(null);

  const roomPathMatch = location.pathname.match(/^\/room\/([^/]+)/);
  const isActiveRoomRoute = Boolean(
    roomPathMatch &&
    currentRoom?._id &&
    String(currentRoom._id) === roomPathMatch[1] &&
    ['waiting', 'voting'].includes(currentRoom.status)
  );

  const guardRoomNavigation = (event) => {
    const anchor = event.target.closest('a[href]');
    const destination = anchor?.getAttribute('href');
    if (!isActiveRoomRoute || !destination || destination === '#' || destination === location.pathname || /^https?:/i.test(destination)) return;

    event.preventDefault();
    setShowNotifications(false);
    setPendingRoomNavigation(destination);
  };

  const confirmRoomNavigation = () => {
    const destination = pendingRoomNavigation;
    setPendingRoomNavigation(null);
    resetRoom();
    navigate(destination || '/dashboard');
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navbar profil sayfasının açılmasını beklemez. Oturumdaki eski/eksik
  // avatar bilgisini uygulama açılır açılmaz güncel profil yanıtıyla eşitler.
  useEffect(() => {
    if (!user?._id) return;
    let cancelled = false;
    api.get('/users/profile')
      .then(({ data }) => {
        if (cancelled) return;
        const profilePic = data.profilePic || '';
        if (profilePic !== (user.profilePic || '') || data.username !== user.username || data.name !== user.name) {
          updateUser({ name: data.name, username: data.username, profilePic });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id]);

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
    const notificationPoll = setInterval(fetchNotifs, 15000);

    // App.jsx'teki global socket handler, yeni bildirim gelince
    // 'bitematch_new_notif' custom event'i fırlatır.
    // Bu sayede tek socket bağlantısı ile hem toast hem navbar güncellenir.
    const handleNewNotif = (e) => {
      setNotifications(prev => {
        // Zaten listede varsa ekleme
        if (prev.some(n => n._id === e.detail._id)) return prev;
        return [e.detail, ...prev];
      });
    };
    window.addEventListener('bitematch_new_notif', handleNewNotif);

    return () => {
      clearInterval(notificationPoll);
      window.removeEventListener('bitematch_new_notif', handleNewNotif);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!showNotifications) return;
    const closeOnOutsideClick = (event) => {
      if (!event.target.closest('[data-notification-menu]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [showNotifications]);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const handleNotificationClick = async (notif) => {
    setShowNotifications(false);
    try {
      const { data } = await api.post(`/notifications/${notif._id}/open`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      if (data.inactive) toast.info('Bu oda daveti artık geçerli değil. Keşfet’e yönlendirildin.');
      navigate(data.link || '/dashboard');
    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    }
  };

  const handleDeleteNotification = async (notif) => {
    if (!notif?._id) return;
    const removedIndex = notifications.findIndex((item) => item._id === notif._id);

    // Render/bağlantı gecikse bile mobilde silme hareketi anında tamamlanmış
    // hissedilir. Sunucu işlemi başarısız olursa yalnızca silinen kaydı yerine
    // koyarız; o sırada gelmiş yeni bildirimleri ezmeyiz.
    setNotifications(prev => prev.filter(item => item._id !== notif._id));
    try {
      await api.delete(`/notifications/${notif._id}`);
    } catch (err) {
      console.error(err);
      setNotifications((prev) => {
        if (prev.some((item) => item._id === notif._id)) return prev;
        const restored = [...prev];
        restored.splice(Math.max(0, Math.min(removedIndex, restored.length)), 0, notif);
        return restored;
      });
      toast.error(err.response?.data?.message || 'Bildirim silinemedi. Lütfen tekrar deneyin.');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <nav className="main-navbar" onClickCapture={guardRoomNavigation} style={{
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
                <Avatar src={user.profilePic} username={user.username} size={22} /> Profil
              </Link>

              {/* Bildirim Çanı (Desktop) */}
              <div data-notification-menu style={{ position: 'relative' }}>
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
                      position: 'absolute', top: '2px', right: '2px', background: 'var(--primary)',
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
                          <NotificationItem key={n._id} notification={n} onOpen={handleNotificationClick} onDelete={handleDeleteNotification} />
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

          {/* Mobilde sağ tarafta Bildirim Çanı + Çıkış Butonu */}
          {isMobile && user && user._id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Bildirim Çanı */}
              <div data-notification-menu style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'white', position: 'relative',
                    minWidth: '36px', minHeight: '36px',
                  }}
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '2px', right: '2px', background: 'var(--primary)',
                      color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '15px', height: '15px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div style={{
                    position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '350px',
                    background: 'rgba(15, 23, 42, 0.97)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 2000,
                    maxHeight: '60vh', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem' }}>Bildirimler</h4>
                      {unreadCount > 0 && (
                        <span onClick={markAllAsRead} style={{ fontSize: '0.7rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Tümünü Okundu</span>
                      )}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hiç bildiriminiz yok.</div>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <NotificationItem key={n._id} notification={n} onOpen={handleNotificationClick} onDelete={handleDeleteNotification} mobile />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Çıkış Butonu */}
              <button
                onClick={() => setShowLogoutModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.8rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontWeight: 600, fontSize: '0.8rem',
                  cursor: 'pointer', minHeight: '36px',
                }}
              >
                <LogOut size={13} /> Çıkış
              </button>
            </div>
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
        <div className="mobile-bottom-nav" onClickCapture={guardRoomNavigation} style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '0.6rem 0', zIndex: 1000,
          boxShadow: '0 -4px 25px rgba(0,0,0,0.5)',
        }}>
          <Link to="/dashboard" className="mobile-nav-discover" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <LayoutDashboard size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Keşfet</span>
          </Link>
          
          <Link to="/history" className="mobile-nav-history" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/history' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <History size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Geçmişim</span>
          </Link>

          <Link to="/messages" className="mobile-nav-messages" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/messages' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <MessageSquare size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Mesajlar</span>
          </Link>

          <Link to="/profile" className="mobile-nav-profile" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            textDecoration: 'none',
            color: location.pathname === '/profile' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <UserCircle size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Profilim</span>
          </Link>

          {user.role === 'Admin' && (
            <Link to="/admin" className="mobile-nav-admin" style={{
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
      {pendingRoomNavigation && (
        <ConfirmModal
          icon={<LogOut size={26} color="#f87171" />}
          title="Odadan ayrılmak istiyor musun?"
          message="Odan açık kalır ve davet bağlantısıyla tekrar katılabilirsin. Sayfadan ayrıldığında mevcut seçim ekranın kapatılır."
          confirmText="Odadan Ayrıl"
          confirmColor="#ef4444"
          onConfirm={confirmRoomNavigation}
          onCancel={() => setPendingRoomNavigation(null)}
        />
      )}
    </>
  );
};

export default Navbar;
