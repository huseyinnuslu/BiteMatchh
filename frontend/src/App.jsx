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
import Messages from './pages/Messages';
import MatchHistory from './pages/MatchHistory';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        .catch(() => {});
    };

    const handleNewNotification = (notif) => {
      if (notif.type === 'message' && window.location.pathname.startsWith('/messages')) return;

      toast.info(
        <div 
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', cursor: 'pointer' }}
          onClick={() => { if (notif.link) window.location.href = notif.link; }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            {notif.type === 'message' ? 'Yeni Mesaj 💬' : 
             notif.type === 'friend_request' ? 'Arkadaşlık İsteği! 🤝' : 
             notif.type === 'room_invite' ? 'Oda Daveti! 📬' : 'Bildirim 🔔'}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>{notif.message}</div>
        </div>,
        { autoClose: 6000, closeOnClick: true }
      );
    };

    socket.on('new_notification', handleNewNotification);

    if (socket.connected) {
      emitOnline();
    } else {
      socket.once('connect', emitOnline);
    }

    return () => { 
      socket.off('connect', emitOnline); 
      socket.off('new_notification', handleNewNotification);
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
            path="/messages" 
            element={<ProtectedRoute><Messages /></ProtectedRoute>} 
          />
        </Routes>
      </div>
      <Footer />
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
    </div>
  );
}

export default App;
