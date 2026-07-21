import { Link } from 'react-router-dom';
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, Shield, UserCircle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

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
                <Link to="/profile" className="btn btn-outline" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                  <UserCircle size={15} /> Profilim
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
