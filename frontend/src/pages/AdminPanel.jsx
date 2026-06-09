import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-toastify';
import { Shield, Users, Home, BarChart3, Trash2, Save, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import ConfirmModal from '../components/ConfirmModal';

// ---- Admin Panel ----
const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Bekleyen rol değişiklikleri: { [userId]: newRole }
  const [pendingRoles, setPendingRoles] = useState({});
  const [savingRole, setSavingRole] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // { type, data }

  useEffect(() => {
    if (!user || user.role !== 'Admin') { navigate('/dashboard'); return; }
    fetchStats(); fetchUsers(); fetchRooms();
  }, []);

  const fetchStats = async () => {
    try { const { data } = await api.get('/admin/stats'); setStats(data); }
    catch { toast.error('İstatistikler yüklenemedi'); }
  };
  const fetchUsers = async () => {
    try { const { data } = await api.get('/admin/users'); setUsers(data); }
    catch { toast.error('Kullanıcılar yüklenemedi'); }
  };
  const fetchRooms = async () => {
    try { const { data } = await api.get('/admin/rooms'); setRooms(data); }
    catch { toast.error('Odalar yüklenemedi'); }
  };

  // Rol dropdown değişince sadece local state'e yaz (henüz kaydetme)
  const handleRoleSelect = (userId, currentRole, newRole) => {
    if (newRole === currentRole) {
      // Değişiklik yoksa pending'den temizle
      setPendingRoles(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      setPendingRoles(prev => ({ ...prev, [userId]: newRole }));
    }
  };

  // Kaydet butonuna basınca - Admin yapılıyorsa onay sor
  const handleSaveRole = (userId, username, newRole) => {
    if (newRole === 'Admin') {
      setModal({ type: 'makeAdmin', data: { userId, username, newRole } });
    } else {
      commitRoleChange(userId, username, newRole);
    }
  };

  // Rol değişikliğini DB'ye yaz
  const commitRoleChange = async (userId, username, newRole) => {
    setSavingRole(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`"${username}" kullanıcısının rolü "${newRole}" olarak güncellendi!`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setPendingRoles(prev => { const n = { ...prev }; delete n[userId]; return n; });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rol güncellenemedi');
    } finally {
      setSavingRole(null);
      setModal(null);
    }
  };

  // Kullanıcı sil
  const handleDeleteUser = (userId, username) => {
    setModal({ type: 'deleteUser', data: { userId, username } });
  };
  const commitDeleteUser = async (userId, username) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(`"${username}" silindi`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Silme başarısız');
    } finally { setModal(null); }
  };

  // Oda sil
  const handleDeleteRoom = (roomId, name) => {
    setModal({ type: 'deleteRoom', data: { roomId, name } });
  };
  const commitDeleteRoom = async (roomId, name) => {
    try {
      await api.delete(`/admin/rooms/${roomId}`);
      toast.success(`"${name}" odası silindi`);
      setRooms(prev => prev.filter(r => r._id !== roomId));
      fetchStats();
    } catch { toast.error('Silme başarısız'); }
    finally { setModal(null); }
  };

  // ---- Yardımcı Bileşenler ----
  const roleBadge = (role) => {
    const map = { Admin: { bg: '#ff6b6b', label: '👑 Admin' }, Host: { bg: '#4ade80', label: '🍽️ Host' }, Guest: { bg: '#94a3b8', label: '👤 Misafir' } };
    const { bg, label } = map[role] || map.Guest;
    return (
      <span style={{ background: `${bg}20`, color: bg, border: `1px solid ${bg}44`, borderRadius: '6px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
        {label}
      </span>
    );
  };


  const tabStyle = (tab) => ({
    padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: activeTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
    boxShadow: activeTab === tab ? '0 4px 12px rgba(255,107,107,0.3)' : 'none',
  });

  // ---- MODAL RENDERER ----
  const renderModal = () => {
    if (!modal) return null;
    if (modal.type === 'deleteUser') {
      const { userId, username } = modal.data;
      return (
        <ConfirmModal
          icon="🗑️" title="Kullanıcıyı Sil" confirmText="Evet, Sil" confirmColor="#ef4444"
          message={`"${username}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          onConfirm={() => commitDeleteUser(userId, username)}
          onCancel={() => setModal(null)}
        />
      );
    }
    if (modal.type === 'deleteRoom') {
      const { roomId, name } = modal.data;
      return (
        <ConfirmModal
          icon="🏠" title="Odayı Sil" confirmText="Evet, Sil" confirmColor="#ef4444"
          message={`"${name}" odasını kalıcı olarak silmek istediğinize emin misiniz?`}
          onConfirm={() => commitDeleteRoom(roomId, name)}
          onCancel={() => setModal(null)}
        />
      );
    }
    if (modal.type === 'makeAdmin') {
      const { userId, username, newRole } = modal.data;
      return (
        <ConfirmModal
          icon="👑" title="Admin Yap" confirmText="Evet, Admin Yap" confirmColor="#ff6b6b"
          message={`"${username}" kullanıcısına Admin yetkisi vermek istediğinize emin misiniz? Bu kullanıcı tüm yönetim işlemlerine erişebilecek.`}
          onConfirm={() => commitRoleChange(userId, username, newRole)}
          onCancel={() => setModal(null)}
        />
      );
    }
  };

  return (
    <>
      {renderModal()}

      <div className="animate-slide-up" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={26} color="#ff6b6b" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ marginBottom: '0.15rem' }}>Admin Paneli</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>BiteMatch Yönetim Ekranı • Hoş geldiniz, {user?.username}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}><BarChart3 size={15} /> İstatistikler</button>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}><Users size={15} /> Kullanıcılar ({users.length})</button>
          <button style={tabStyle('rooms')} onClick={() => setActiveTab('rooms')}><Home size={15} /> Odalar ({rooms.length})</button>
        </div>

        {/* ===== STATS TAB ===== */}
        {activeTab === 'stats' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '1rem' }}>
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

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Kullanıcı Listesi</h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {Object.keys(pendingRoles).length > 0 && `${Object.keys(pendingRoles).length} kaydedilmemiş değişiklik`}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Kullanıcı', 'Email', 'Mevcut Rol', 'Yeni Rol', 'İşlemler'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const pending = pendingRoles[u._id];
                    const hasPending = pending !== undefined && pending !== u.role;
                    return (
                      <tr key={u._id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', background: hasPending ? 'rgba(255,107,107,0.04)' : 'transparent' }}
                        onMouseEnter={e => { if (!hasPending) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { if (!hasPending) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Kullanıcı Adı */}
                        <td style={{ padding: '0.85rem 1.2rem', fontWeight: 700 }}>
                          {u.role === 'Admin' ? '👑 ' : u.role === 'Guest' ? '👤 ' : '🍽️ '}{u.username}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(u.createdAt).toLocaleDateString('tr-TR')} tarihinde katıldı
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>

                        {/* Mevcut Rol */}
                        <td style={{ padding: '0.85rem 1.2rem' }}>{roleBadge(u.role)}</td>

                        {/* Yeni Rol - Dropdown */}
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          {u.role !== 'Admin' ? (
                            <select
                              value={pending !== undefined ? pending : u.role}
                              onChange={e => handleRoleSelect(u._id, u.role, e.target.value)}
                              style={{
                                background: hasPending ? 'rgba(255,107,107,0.1)' : 'rgba(255,255,255,0.07)',
                                border: `1px solid ${hasPending ? 'rgba(255,107,107,0.4)' : 'rgba(255,255,255,0.12)'}`,
                                color: 'var(--text)', borderRadius: '8px', padding: '5px 10px',
                                fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
                                fontWeight: hasPending ? 700 : 400,
                              }}
                            >
                              <option value="Host" style={{ background: '#1a1a2e' }}>🍽️ Host</option>
                              <option value="Guest" style={{ background: '#1a1a2e' }}>👤 Misafir</option>
                              <option value="Admin" style={{ background: '#1a1a2e' }}>👑 Admin</option>
                            </select>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>

                        {/* İşlemler */}
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {u.role !== 'Admin' && hasPending && (
                              <>
                                <button
                                  onClick={() => handleSaveRole(u._id, u.username, pending)}
                                  disabled={savingRole === u._id}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                                    color: '#4ade80', borderRadius: '7px', padding: '5px 12px',
                                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                  }}
                                >
                                  <Save size={13} /> {savingRole === u._id ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                                <button
                                  onClick={() => handleRoleSelect(u._id, u.role, u.role)}
                                  style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--text-muted)', borderRadius: '7px', padding: '5px 8px',
                                    fontSize: '0.8rem', cursor: 'pointer',
                                  }}
                                >
                                  <X size={13} />
                                </button>
                              </>
                            )}
                            {u.role !== 'Admin' && (
                              <button
                                onClick={() => handleDeleteUser(u._id, u.username)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)',
                                  color: '#f87171', borderRadius: '7px', padding: '5px 10px',
                                  fontSize: '0.8rem', cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} /> Sil
                              </button>
                            )}
                            {u.role === 'Admin' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>🔒 Korumalı</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ROOMS TAB ===== */}
        {activeTab === 'rooms' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: 0 }}>Oda Listesi</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Oda Adı', 'Oluşturan', 'Katılımcı', 'Durum', 'Oluşturulma', 'İşlemler'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r._id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1.2rem', fontWeight: 700 }}>🏠 {r.name || 'İsimsiz Oda'}</td>
                      <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)' }}>{r.host?.username || '—'}</td>
                      <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {r.participants?.length || 0} kişi
                      </td>
                      <td style={{ padding: '0.85rem 1.2rem' }}>
                        <span style={{
                          background: r.status === 'finished' ? 'rgba(148,163,184,0.15)' : r.status === 'voting' ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                          color: r.status === 'finished' ? '#94a3b8' : r.status === 'voting' ? '#fbbf24' : '#4ade80',
                          border: `1px solid ${r.status === 'finished' ? 'rgba(148,163,184,0.3)' : r.status === 'voting' ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
                          borderRadius: '6px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          {r.status === 'waiting' ? '⏳ Bekleniyor' : r.status === 'voting' ? '🗳️ Oylama' : '✅ Tamamlandı'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding: '0.85rem 1.2rem' }}>
                        <button
                          onClick={() => handleDeleteRoom(r._id, r.name || 'Bu oda')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)',
                            color: '#f87171', borderRadius: '7px', padding: '5px 10px',
                            fontSize: '0.8rem', cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} /> Sil
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
    </>
  );
};

export default AdminPanel;
