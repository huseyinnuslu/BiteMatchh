import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Auth durumu henüz localStorage'dan okunmadı — bekle
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--primary)', borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Yükleniyor...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.usernameOnboardingRequired && location.pathname !== '/choose-username') {
    const destination = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/choose-username" state={{ from: destination }} replace />;
  }

  return children;
};

export default ProtectedRoute;
