import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-toastify';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/dashboard');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchRooms();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      toast.error('İstatistikler yüklenemedi');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      toast.error('Kullanıcılar yüklenemedi');
    }
  };

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/admin/rooms');
      setRooms(data);
    } catch (err) {
      toast.error('Odalar yüklenemedi');
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`"${username}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Kullanıcı silindi');
      setUsers(users.filter(u => u._id !== id));
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      toast.success('Rol güncellendi');
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rol güncellenemedi');
    }
  };

  const handleDeleteRoom = async (id, name) => {
    if (!window.confirm(`"${name}" odasını silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/admin/rooms/${id}`);
      toast.success('Oda silindi');
      setRooms(rooms.filter(r => r._id !== id));
      fetchStats();
    } catch (err) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const roleBadge = (role) => {
    const colors = { Admin: '#ff6b6b', Host: '#4ade80', Guest: '#94a3b8' };
    return (
      <span style={{
        background: `${colors[role]}22`,
        color: colors[role],
        border: `1px solid ${colors[role]}44`,
        borderRadius: '6px',
        padding: '2px 10px',
        fontSize: '0.78rem',
        fontWeight: 600,
      }}>{role}</span>
    );
  };

  const StatCard = ({ icon, label, value, color }) => (
    <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: color || 'var(--primary)' }}>{value ?? '—'}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );

  const tabStyle = (tab) => ({
    padding: '0.6rem 1.4rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    background: activeTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
  });

  return (
    <div className="animate-slide-up" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem' }}>🛡️</div>
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.2rem' }}>Admin Paneli</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>BiteMatch Yönetim Ekranı</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>📊 İstatistikler</button>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>👥 Kullanıcılar ({users.length})</button>
        <button style={tabStyle('rooms')} onClick={() => setActiveTab('rooms')}>🏠 Odalar ({rooms.length})</button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          <StatCard icon="👥" label="Toplam Kullanıcı" value={stats.totalUsers} color="#60a5fa" />
          <StatCard icon="🏠" label="Toplam Oda" value={stats.totalRooms} color="#a78bfa" />
          <StatCard icon="🟢" label="Aktif Odalar" value={stats.activeRooms} color="#4ade80" />
          <StatCard icon="✅" label="Tamamlanan Odalar" value={stats.completedRooms} color="#34d399" />
          <StatCard icon="👑" label="Host Kullanıcılar" value={stats.hostUsers} color="#fbbf24" />
          <StatCard icon="👤" label="Misafir Kullanıcılar" value={stats.guestUsers} color="#94a3b8" />
          <StatCard icon="🛡️" label="Admin Kullanıcılar" value={stats.adminUsers} color="#ff6b6b" />
          <StatCard icon="🆕" label="Bu Hafta Yeni Üye" value={stats.newUsersThisWeek} color="#38bdf8" />
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0 }}>Kullanıcı Listesi</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Kullanıcı Adı', 'Email', 'Rol', 'Kayıt Tarihi', 'İşlemler'].map(h => (
                    <th key={h} style={{ padding: '0.9rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>
                      {u.role === 'Admin' ? '👑 ' : u.role === 'Guest' ? '👤 ' : '🍽️ '}{u.username}
                    </td>
                    <td style={{ padding: '0.9rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{u.email}</td>
                    <td style={{ padding: '0.9rem 1.2rem' }}>{roleBadge(u.role)}</td>
                    <td style={{ padding: '0.9rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '0.9rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {u.role !== 'Admin' && (
                          <>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              <option value="Host">Host</option>
                              <option value="Guest">Guest</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleDeleteUser(u._id, u.username)}
                              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              🗑️ Sil
                            </button>
                          </>
                        )}
                        {u.role === 'Admin' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Korumalı</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0 }}>Oda Listesi</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Oda Adı', 'Oluşturan', 'Durum', 'Oluşturulma', 'İşlemler'].map(h => (
                    <th key={h} style={{ padding: '0.9rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.9rem 1.2rem', fontWeight: 600 }}>🏠 {r.name || 'İsimsiz Oda'}</td>
                    <td style={{ padding: '0.9rem 1.2rem', color: 'var(--text-muted)' }}>{r.host?.username || '—'}</td>
                    <td style={{ padding: '0.9rem 1.2rem' }}>
                      <span style={{
                        background: r.status === 'finished' ? 'rgba(148,163,184,0.15)' : 'rgba(74,222,128,0.15)',
                        color: r.status === 'finished' ? '#94a3b8' : '#4ade80',
                        border: `1px solid ${r.status === 'finished' ? 'rgba(148,163,184,0.3)' : 'rgba(74,222,128,0.3)'}`,
                        borderRadius: '6px',
                        padding: '2px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        {r.status === 'waiting' ? '⏳ Bekleniyor' : r.status === 'voting' ? '🗳️ Oylama' : '✅ Tamamlandı'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '0.9rem 1.2rem' }}>
                      <button
                        onClick={() => handleDeleteRoom(r._id, r.name || 'Bu oda')}
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        🗑️ Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
