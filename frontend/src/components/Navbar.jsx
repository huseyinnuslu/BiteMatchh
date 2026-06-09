import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Flame } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container flex-center" style={{ justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame color="var(--primary)" size={28} />
          <h2 className="text-gradient" style={{ margin: 0 }}>BiteMatch</h2>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Dashboard</Link>
              {user.role === 'Admin' && (
                <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem 1rem', borderColor: '#ff6b6b', color: '#ff6b6b' }}>🛡️ Admin</Link>
              )}
              <button onClick={logout} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Çıkış</button>
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
  );
};

export default Navbar;
