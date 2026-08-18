import { Routes, Route, useLocation } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import { connectSocket } from './socket/socketClient';
import api from './api';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import ForgotPassword from './pages/ForgotPassword';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Messages from './pages/Messages';
import MatchHistory from './pages/MatchHistory';
import Terms from './pages/Terms';
import Settings from './pages/Settings';
import EmailChange from './pages/EmailChange';
import Support from './pages/Support';
import ChooseUsername from './pages/ChooseUsername';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const { user, updateUser } = useContext(AuthContext);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isMessagesRoute = location.pathname === '/messages';
  const isUsernameOnboardingRoute = location.pathname === '/choose-username';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Global online presence ─────────────────────────────────────────────
  // user_online eventi hangi sayfada olursa olsun yayınlanır.
  // 'connect' eventi; ilk bağlanmada + her yeniden bağlanmada tetiklenir.
  useEffect(() => {
    if (!user?._id) return;
    const token = (() => {
      try { return JSON.parse(localStorage.getItem('userInfo') || '{}')?.token; }
      catch { return null; }
    })();
    if (!token) return;

    const socket = connectSocket(token);

    const emitOnline = () => {
      api.get('/users/friends')
        .then(({ data }) => {
          socket.emit('user_online', {
            userId:    user._id,
            friendIds: data.map(f => f._id?.toString()),
          });
        })
        .catch(() => {
          // Arkadaş listesi alınamazsa bile kişisel odayı kur
          socket.emit('user_online', { userId: user._id, friendIds: [] });
        });
    };

    const handleNewNotification = (notif) => {
      // Navbar bildirim listesini güncelle (custom event ile)
      window.dispatchEvent(new CustomEvent('bitematch_new_notif', { detail: notif }));
      if (notif.type === 'room_invite') return;

      toast.info(
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', cursor: 'pointer' }}
          onClick={() => { if (notif.link) window.location.href = notif.link; }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            {notif.type === 'message' ? 'Yeni mesaj' :
             notif.type === 'friend_request' ? 'Arkadaşlık isteği' :
             notif.type === 'room_invite' ? 'Oda daveti' : 'Bildirim'}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>{notif.message}</div>
        </div>,
        { autoClose: 6000, closeOnClick: true }
      );
    };

    const handleRoomInvitation = ({ roomId, inviterName, message, notificationId }) => {
      // This is a dedicated fallback for invitations. It keeps the invitation
      // visible even if the generic notification event is delayed.
      toast.info(`${message || `${inviterName} sizi bir odaya davet etti!`}`, {
        autoClose: 6000,
        onClick: async () => {
          try {
            // Zil listesindeki davranışla aynıdır: davet hâlâ aktif mi ve
            // kullanıcı başka bir canlı odada mı, önce sunucu kontrol eder.
            const { data } = notificationId
              ? await api.post(`/notifications/${notificationId}/open`)
              : { data: { link: `/room/${roomId}` } };
            window.location.assign(data.link || '/dashboard');
          } catch {
            window.location.assign('/dashboard');
          }
        },
      });
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('room_invitation', handleRoomInvitation);
    const handleAvatarUpdated = (payload) => {
      if (payload?.userId === user._id) {
        const profilePic = payload.avatarUrl
          ? (payload.avatarUrl.includes('?') ? payload.avatarUrl : `${payload.avatarUrl}?v=${payload.version || Date.now()}`)
          : '';
        updateUser({ profilePic });
      }
      window.dispatchEvent(new CustomEvent('bitematch_avatar_updated', { detail: payload }));
    };
    socket.on('profile_avatar_updated', handleAvatarUpdated);
    const handleFriendshipUpdated = (payload) => {
      window.dispatchEvent(new CustomEvent('bitematch_friendship_updated', { detail: payload }));
    };
    socket.on('friendship_updated', handleFriendshipUpdated);

    // Her bağlanmada (ilk + reconnect) user_online emit et
    socket.on('connect', emitOnline);
    if (socket.connected) emitOnline();

    return () => { 
      socket.off('connect', emitOnline); 
      socket.off('new_notification', handleNewNotification);
      socket.off('room_invitation', handleRoomInvitation);
      socket.off('profile_avatar_updated', handleAvatarUpdated);
      socket.off('friendship_updated', handleFriendshipUpdated);
    };
  }, [user?._id]);
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`app-container${isMessagesRoute ? ' messages-route' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      {!isUsernameOnboardingRoute && <Navbar />}
      <div className="container" style={{ flex: 1, paddingBottom: isUsernameOnboardingRoute ? 0 : (isMobile ? (isMessagesRoute ? 0 : '6rem') : '3rem'), width: '100%', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/choose-username" element={<ProtectedRoute><ChooseUsername /></ProtectedRoute>} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/history" 
            element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} 
          />
          <Route 
            path="/room/:id" 
            element={<ProtectedRoute><Room /></ProtectedRoute>} 
          />
          <Route 
            path="/admin" 
            element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} 
          />
          <Route 
            path="/profile" 
            element={<ProtectedRoute><Profile /></ProtectedRoute>} 
          />
          <Route 
            path="/profile/:id" 
            element={<ProtectedRoute><UserProfile /></ProtectedRoute>} 
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><Settings /></ProtectedRoute>}
          />
          <Route path="/settings/email" element={<ProtectedRoute><EmailChange /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route 
            path="/messages" 
            element={<ProtectedRoute><Messages /></ProtectedRoute>} 
          />
        </Routes>
      </div>
      {!isMessagesRoute && !isUsernameOnboardingRoute && <Footer />}
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </div>
  );
}

export default App;
