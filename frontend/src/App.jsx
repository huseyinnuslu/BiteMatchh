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
import Support from './pages/Support';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { ToastContainer, toast } from 'react-toastify';
import { BellRing, CalendarPlus, MessageCircle, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

const notificationMeta = (type) => {
  const types = {
    message: { title: 'Yeni mesaj', icon: MessageCircle, color: '#60a5fa' },
    friend_request: { title: 'Arkadaşlık isteği', icon: UserPlus, color: '#c4b5fd' },
    room_invite: { title: 'Oda daveti', icon: CalendarPlus, color: '#86efac' },
    match: { title: 'Eşleşme sağlandı', icon: Sparkles, color: '#fda4af' },
    support: { title: 'Yeni destek talebi', icon: ShieldCheck, color: '#fcd34d' },
  };
  return types[type] || { title: 'BiteMatch bildirimi', icon: BellRing, color: '#93c5fd' };
};

const InAppNotificationToast = ({ type, message, onOpen }) => {
  const { title, icon: Icon, color } = notificationMeta(type);
  return (
    <button type="button" className="bitematch-notification-toast" onClick={onOpen}>
      <span className="bitematch-notification-icon" style={{ color, background: `${color}1f`, borderColor: `${color}55` }}><Icon size={18} /></span>
      <span className="bitematch-notification-copy">
        <span className="bitematch-notification-title">{title}</span>
        <span className="bitematch-notification-message">{message}</span>
      </span>
      <span className="bitematch-notification-cta">Aç</span>
    </button>
  );
};

function App() {
  const { user } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
        <InAppNotificationToast
          type={notif.type}
          message={notif.message}
          onOpen={() => { if (notif.link) window.location.href = notif.link; }}
        />,
        { autoClose: 6000, closeOnClick: false }
      );
    };

    const handleRoomInvitation = ({ roomId, inviterName, message }) => {
      // This is a dedicated fallback for invitations. It keeps the invitation
      // visible even if the generic notification event is delayed.
      toast.info(<InAppNotificationToast
        type="room_invite"
        message={message || `${inviterName} sizi bir odaya davet etti!`}
        onOpen={() => { window.location.href = `/room/${roomId}`; }}
      />, {
        autoClose: 6000,
        closeOnClick: false,
      });
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('room_invitation', handleRoomInvitation);

    // Her bağlanmada (ilk + reconnect) user_online emit et
    socket.on('connect', emitOnline);
    if (socket.connected) emitOnline();

    return () => { 
      socket.off('connect', emitOnline); 
      socket.off('new_notification', handleNewNotification);
      socket.off('room_invitation', handleRoomInvitation);
    };
  }, [user?._id]);
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <Navbar />
      <div className="container" style={{ flex: 1, paddingBottom: isMobile ? '6rem' : '3rem', width: '100%', boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/terms" element={<Terms />} />
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
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route 
            path="/messages" 
            element={<ProtectedRoute><Messages /></ProtectedRoute>} 
          />
        </Routes>
      </div>
      <Footer />
      <ToastContainer
        position="top-right"
        theme="dark"
        autoClose={3500}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable={false}
        className="bitematch-toast-container"
        toastClassName="bitematch-toast"
        bodyClassName="bitematch-toast-body"
        progressClassName="bitematch-toast-progress"
      />
    </div>
  );
}

export default App;
