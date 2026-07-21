import { Routes, Route, useLocation } from 'react-router-dom';
import { useContext, useEffect } from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const { user } = useContext(AuthContext);

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

    if (socket.connected) {
      emitOnline();
    } else {
      socket.once('connect', emitOnline);
    }

    return () => { socket.off('connect', emitOnline); };
  }, [user?._id]);
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
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
