import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { toast } from 'react-toastify';
import { Shield, Users, Home, BarChart3, Trash2, Save, X, AlertOctagon, Activity, CheckCircle2, TrendingUp, MessageCircle, Images, Pencil, Heart } from 'lucide-react';
import StatCard from '../components/StatCard';
import ConfirmModal from '../components/ConfirmModal';

const CatalogImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(!src);

  return (
    <div style={{ height: 140, background: 'rgba(255,255,255,.04)', position: 'relative', display: 'grid', placeItems: 'center' }}>
      {!failed && <img src={src} alt={alt} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      {failed && <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{src ? 'Görsel yüklenemedi' : 'Görsel tanımlı değil'}</span>}
    </div>
  );
};

// ---- Admin Panel ----
const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') === 'support' ? 'support' : 'stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState({});
  const [replyingToSupport, setReplyingToSupport] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState('mekan');
  const [catalogSort, setCatalogSort] = useState('default');
  const [editingCard, setEditingCard] = useState(null);
  const [catalogDraft, setCatalogDraft] = useState({});
  const [savingCatalogCard, setSavingCatalogCard] = useState(false);

  // Bulk Delete States
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // Etkinlik import state'leri
  const [jsonInput, setJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [clearOld, setClearOld] = useState(false);

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
  const fetchSupportRequests = async () => {
    try { const { data } = await api.get('/admin/support'); setSupportRequests(data); }
    catch { toast.error('Destek talepleri yüklenemedi'); }
  };
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const { data } = await api.get(`/admin/catalog?fresh=${Date.now()}`);
      setCatalog({
        mekan: Array.isArray(data?.mekan) ? data.mekan : [],
        film: Array.isArray(data?.film) ? data.film : [],
        aktivite: Array.isArray(data?.aktivite) ? data.aktivite : [],
      });
    }
    catch { toast.error('Kart kataloğu yüklenemedi'); }
    finally { setCatalogLoading(false); }
  };
  const startCatalogEdit = (card, editorKey) => {
    const cardId = card.sourceName || card.name;
    if (!cardId) return toast.error('Bu kartın kimliği alınamadı. Kataloğu yenileyip tekrar dene.');
    setEditingCard(editorKey);
    setCatalogDraft({ name: card.name, imageUrl: card.imageUrl, description: card.description, budget: card.budget, platform: card.platform, imdbScore: card.imdbScore ?? '', duration: card.duration, mapsQuery: card.mapsQuery, venueConcept: card.venueConcept, visualLabel: card.visualLabel });
  };
  const saveCatalogCard = async (card) => {
    const cardId = card.sourceName || card.name;
    if (!cardId) return toast.error('Kart kimliği olmadığı için kaydedilemedi.');
    setSavingCatalogCard(true);
    try {
      await api.put(`/admin/catalog/${catalogCategory}/${encodeURIComponent(cardId)}`, catalogDraft);
      await fetchCatalog();
      setEditingCard(null);
      toast.success('Kart güncellendi. Yeni odalarda bu içerik kullanılacak.');
    } catch (error) { toast.error(error.response?.data?.message || 'Kart güncellenemedi'); }
    finally { setSavingCatalogCard(false); }
  };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('tab') === 'support') {
      setActiveTab('support');
      fetchSupportRequests();
    }
  }, [location.search]);

  const resolveSupportRequest = async (id, status) => {
    try {
      const { data } = await api.put(`/admin/support/${id}`, { status });
      setSupportRequests(prev => prev.map(item => item._id === id ? { ...item, status: data.status } : item));
    } catch (error) { toast.error(error.response?.data?.message || 'Destek talebi güncellenemedi'); }
  };

  const sendSupportReply = async (id) => {
    const message = String(supportReplyDrafts[id] || '').trim();
    if (message.length < 2) return toast.error('Yanıtın en az 2 karakter olmalı.');
    setReplyingToSupport(id);
    try {
      const { data } = await api.post(`/admin/support/${id}/replies`, { message });
      setSupportRequests(prev => prev.map(item => item._id === id ? data : item));
      setSupportReplyDrafts(prev => ({ ...prev, [id]: '' }));
      toast.success('Yanıt kullanıcıya iletildi.');
    } catch (error) { toast.error(error.response?.data?.message || 'Destek yanıtı gönderilemedi'); }
    finally { setReplyingToSupport(null); }
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
      setRooms(rooms.filter(r => r._id !== roomId));
      toast.success(`"${name}" odası başarıyla silindi.`);
    } catch (err) {
      toast.error('Oda silinirken hata oluştu.');
    }
    setModal(null);
  };

  // ---- BULK DELETE LOGIC ----
  const toggleUserSelection = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const toggleRoomSelection = (id) => {
    setSelectedRooms(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleBulkDeleteUsers = () => {
    if (selectedUsers.length === 0) return;
    setModal({ type: 'bulkDeleteUsers', data: { count: selectedUsers.length } });
  };

  const commitBulkDeleteUsers = async () => {
    try {
      const res = await api.delete('/admin/users/bulk', { data: { ids: selectedUsers } });
      toast.success(res.data.message || `${selectedUsers.length} kullanıcı silindi.`);
      setUsers(users.filter(u => !selectedUsers.includes(u._id)));
      setSelectedUsers([]);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toplu silme işlemi başarısız oldu.');
    }
    setModal(null);
  };

  const handleBulkDeleteRooms = () => {
    if (selectedRooms.length === 0) return;
    setModal({ type: 'bulkDeleteRooms', data: { count: selectedRooms.length } });
  };

  const commitBulkDeleteRooms = async () => {
    try {
      const res = await api.delete('/admin/rooms/bulk', { data: { ids: selectedRooms } });
      toast.success(res.data.message || `${selectedRooms.length} oda silindi.`);
      setRooms(rooms.filter(r => !selectedRooms.includes(r._id)));
      setSelectedRooms([]);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toplu silme işlemi başarısız oldu.');
    }
    setModal(null);
  };

  // JSON Import
  const handleImportEvents = async () => {
    try {
      setIsImporting(true);
      const parsedData = JSON.parse(jsonInput);
      if (!Array.isArray(parsedData)) {
        toast.error('JSON verisi bir array (liste) formatında olmalıdır [ { ... } ]');
        return;
      }
      
      const { data } = await api.post('/admin/import-events', { events: parsedData, clearOld });
      toast.success(data.message || 'Veriler başarıyla eklendi!');
      setJsonInput('');
      setClearOld(false);
      fetchStats();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('Geçersiz JSON formatı. Lütfen kontrol edin.');
      } else {
        toast.error(err.response?.data?.message || 'Veri aktarımı başarısız oldu');
      }
    } finally {
      setIsImporting(false);
    }
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
    if (modal.type === 'bulkDeleteUsers') {
      return (
        <ConfirmModal
          icon={<Trash2 size={48} color="#ef4444" />} title="Kullanıcıları Toplu Sil" confirmText="Evet, Sil" confirmColor="#ef4444"
          message={`Seçilen ${modal.data.count} kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          onConfirm={commitBulkDeleteUsers}
          onCancel={() => setModal(null)}
        />
      );
    }
    if (modal.type === 'bulkDeleteRooms') {
      return (
        <ConfirmModal
          icon={<Trash2 size={48} color="#ef4444" />} title="Odaları Toplu Sil" confirmText="Evet, Sil" confirmColor="#ef4444"
          message={`Seçilen ${modal.data.count} odayı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          onConfirm={commitBulkDeleteRooms}
          onCancel={() => setModal(null)}
        />
      );
    }
  };

  return (
    <>
      {renderModal()}

      <div className="animate-slide-up admin-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={26} color="#ff6b6b" />
            </div>
            <div>
              <h1 className="text-gradient" style={{ marginBottom: '0.15rem' }}>Admin Paneli</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>BiteMatch Yönetim Ekranı — Hoş geldiniz, {user?.username}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}><BarChart3 size={15} /> İstatistikler</button>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}><Users size={15} /> Kullanıcılar ({users.length})</button>
          <button style={tabStyle('rooms')} onClick={() => setActiveTab('rooms')}><Home size={15} /> Odalar ({rooms.length})</button>
          <button style={tabStyle('events')} onClick={() => setActiveTab('events')}>📅 Etkinlikler</button>
          <button style={tabStyle('catalog')} onClick={() => { setActiveTab('catalog'); if (!catalog) fetchCatalog(); }}><Images size={15} /> Kart Kataloğu</button>
          <button style={tabStyle('support')} onClick={() => { setActiveTab('support'); fetchSupportRequests(); }}><MessageCircle size={15} /> Destek ({supportRequests.filter(item => item.status === 'open').length})</button>
        </div>

        {/* ===== STATS TAB ===== */}
        {activeTab === 'stats' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Sağlık Göstergeleri (Health Widgets) */}
            <div>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Activity size={18} /> Sistem Sağlığı Analizi
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                
                {/* 1. Toplam Kullanıcı ve Son 24 Saat */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '0.6rem', borderRadius: '12px', color: '#60a5fa' }}>
                      <Users size={24} />
                    </div>
                    <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <TrendingUp size={12} /> +{stats.newUsersToday} (24s)
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{stats.totalUsers}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Toplam Kullanıcı</div>
                  </div>
                </div>

                {/* 2. Toplam Oda ve Son 24 Saat */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '0.6rem', borderRadius: '12px', color: '#a78bfa' }}>
                      <Home size={24} />
                    </div>
                    <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <TrendingUp size={12} /> +{stats.newRoomsToday} (24s)
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{stats.totalRooms}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Toplam Oda</div>
                  </div>
                </div>

                {/* 3. Eşleşme Başarı Oranı */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '0.6rem', borderRadius: '12px', color: '#34d399' }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{stats.completedRooms} / {stats.totalRooms} Oda</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                      {stats.totalRooms > 0 ? ((stats.completedRooms / stats.totalRooms) * 100).toFixed(1) : 0}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Eşleşme Başarı Oranı</div>
                  </div>
                </div>

                {/* 4. Katılımcı Analizi */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '0.6rem', borderRadius: '12px', color: '#fbbf24' }}>
                      <BarChart3 size={24} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{stats.multiUserRooms}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>çoklu vs</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff6b6b' }}>{stats.singleUserRooms}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>tekli</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Çok Katılımcılı Odalar (2+)</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Diğer Genel İstatistikler */}
            <div>
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }}>Genel Metrikler</h3>
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
            </div>

          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Kullanıcı Listesi</h3>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={handleBulkDeleteUsers}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444', borderRadius: '6px', padding: '0.4rem 0.8rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                    }}
                  >
                    Seçilenleri Sil ({selectedUsers.length})
                  </button>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {Object.keys(pendingRoles).length > 0 && `${Object.keys(pendingRoles).length} kaydedilmemiş değişiklik`}
              </span>
            </div>
            <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
              <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '0.85rem 1.2rem', textAlign: 'left', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={users.length > 0 && selectedUsers.length === users.filter(u => u.role !== 'Admin').length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.filter(u => u.role !== 'Admin').map(u => u._id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </th>
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
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          {u.role !== 'Admin' && (
                            <input 
                              type="checkbox" 
                              checked={selectedUsers.includes(u._id)}
                              onChange={() => toggleUserSelection(u._id)}
                            />
                          )}
                        </td>
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
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Oda Listesi</h3>
                {selectedRooms.length > 0 && (
                  <button
                    onClick={handleBulkDeleteRooms}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444', borderRadius: '6px', padding: '0.4rem 0.8rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                    }}
                  >
                    Seçilenleri Sil ({selectedRooms.length})
                  </button>
                )}
              </div>
            </div>
            <div className="admin-table-scroll" style={{ overflowX: 'auto' }}>
              <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '0.85rem 1.2rem', textAlign: 'left', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={rooms.length > 0 && selectedRooms.length === rooms.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRooms(rooms.map(r => r._id));
                          } else {
                            setSelectedRooms([]);
                          }
                        }}
                      />
                    </th>
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
                      <td style={{ padding: '0.85rem 1.2rem' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedRooms.includes(r._id)}
                          onChange={() => toggleRoomSelection(r._id)}
                        />
                      </td>
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

        {activeTab === 'support' && (
          <div style={{ display: 'grid', gap: '.8rem' }}>
            {supportRequests.length === 0 ? <div className="glass-card" style={{ padding: '1.3rem', color: 'var(--text-muted)' }}>Henüz destek talebi yok.</div> : supportRequests.map((request) => (
              <article key={request._id} className="glass-card" style={{ padding: '1.1rem', borderLeft: `3px solid ${request.status === 'open' ? 'var(--primary)' : 'rgba(74,222,128,.8)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div><div style={{ color: 'white', fontWeight: 800 }}>{request.subject}</div><div style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginTop: 4 }}>@{request.user?.username || 'Silinmiş kullanıcı'} · {request.user?.email || '—'} · {new Date(request.createdAt).toLocaleString('tr-TR')}</div></div>
                  <button onClick={() => resolveSupportRequest(request._id, request.status === 'open' ? 'resolved' : 'open')} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, padding: '.42rem .65rem', background: request.status === 'open' ? 'rgba(74,222,128,.1)' : 'transparent', color: request.status === 'open' ? '#86efac' : 'var(--text-muted)', cursor: 'pointer', fontSize: '.76rem', fontWeight: 700 }}>{request.status === 'open' ? 'Çözüldü olarak işaretle' : 'Yeniden aç'}</button>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,.82)', lineHeight: 1.55, margin: '.85rem 0 0', fontSize: '.88rem' }}>{request.message}</p>
                {(request.replies || []).map((reply) => <div key={reply._id || reply.createdAt} style={{ marginTop: '.7rem', padding: '.7rem .8rem', background: 'rgba(110,86,255,.1)', border: '1px solid rgba(135,112,255,.24)', borderRadius: 8 }}><div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '.73rem' }}>Destek yanıtı · @{reply.admin?.username || 'admin'}</div><div style={{ color: 'white', whiteSpace: 'pre-wrap', marginTop: 4, fontSize: '.84rem' }}>{reply.message}</div></div>)}
                <div style={{ display: 'flex', gap: '.55rem', marginTop: '.85rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <textarea value={supportReplyDrafts[request._id] || ''} onChange={(event) => setSupportReplyDrafts(prev => ({ ...prev, [request._id]: event.target.value }))} maxLength={2000} rows={3} placeholder="Kullanıcıya destek yanıtı yaz..." style={{ flex: '1 1 300px', minHeight: 72, padding: '.65rem', background: 'rgba(0,0,0,.16)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, color: 'white', resize: 'vertical', fontFamily: 'inherit' }} />
                  <button onClick={() => sendSupportReply(request._id)} disabled={replyingToSupport === request._id} style={{ border: 0, borderRadius: 8, padding: '.65rem .8rem', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '.78rem', fontWeight: 800 }}>{replyingToSupport === request._id ? 'Gönderiliyor...' : 'Yanıtla'}</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'catalog' && (
          <section>
            <div className="glass-card" style={{ padding: '1.15rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '.5rem' }}><Images size={19} color="var(--primary)" /> Kart Kataloğu</h3>
                  <p style={{ margin: '.4rem 0 0', color: 'var(--text-muted)', fontSize: '.82rem', lineHeight: 1.45 }}>Oda kurmadan tüm statik kartları ve gerçek görsel kaynaklarını kontrol et. Görsel yüklenmezse kartın üzerinde açıkça görürsün.</p>
                </div>
                <button type="button" onClick={fetchCatalog} disabled={catalogLoading} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, padding: '.5rem .7rem', background: 'rgba(255,255,255,.05)', color: 'white', fontSize: '.76rem', fontWeight: 700, cursor: catalogLoading ? 'wait' : 'pointer' }}>{catalogLoading ? 'Yükleniyor...' : 'Yenile'}</button>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {[['mekan', 'Ne Yiyelim'], ['film', 'Ne İzleyelim'], ['aktivite', 'Ne Yapalım']].map(([key, label]) => <button key={key} type="button" onClick={() => { setCatalogCategory(key); setEditingCard(null); }} style={{ border: `1px solid ${catalogCategory === key ? 'var(--primary)' : 'rgba(255,255,255,.14)'}`, borderRadius: 20, padding: '.45rem .75rem', background: catalogCategory === key ? 'rgba(255,75,75,.15)' : 'transparent', color: catalogCategory === key ? 'white' : 'var(--text-muted)', fontSize: '.78rem', cursor: 'pointer', fontWeight: 800 }}>{label} ({catalog?.[key]?.length || 0})</button>)}
              </div>
            </div>

            {catalogLoading && !catalog ? <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Kartlar hazırlanıyor...</div> : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.8rem' }}>
                  <select value={catalogSort} onChange={(event) => setCatalogSort(event.target.value)} style={{ background: '#172238', color: 'white', border: '1px solid rgba(255,255,255,.16)', borderRadius: 8, padding: '.5rem .65rem', fontSize: '.78rem' }}>
                    <option value="default">Varsayılan sıralama</option><option value="likes">En çok beğenilenler</option><option value="rate">En yüksek beğeni oranı</option><option value="least">En az etkileşim alanlar</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gap: '.7rem' }}>
                  {[...(catalog?.[catalogCategory] || [])].sort((a, b) => catalogSort === 'likes' ? (Number(b.likes) || 0) - (Number(a.likes) || 0) : catalogSort === 'rate' ? (Number(b.likeRate) || -1) - (Number(a.likeRate) || -1) : catalogSort === 'least' ? (Number(a.swipes) || 0) - (Number(b.swipes) || 0) : 0).map((card, index) => {
                    const cardId = card.sourceName || card.name || card.mapsQuery;
                    const editorKey = `${catalogCategory}:${cardId}:${index}`;
                    const displayName = card.name || card.sourceName || card.mapsQuery || 'Adı tanımlanmamış kart';
                    const likes = Number(card.likes) || 0;
                    const swipes = Number(card.swipes) || 0;
                    const likeRate = Number.isFinite(Number(card.likeRate)) ? Number(card.likeRate) : null;
                    return (
                  <article key={editorKey} className="glass-card" style={{ overflow: 'hidden', padding: 0, border: '1px solid rgba(255,255,255,.1)', background: '#18243a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr) auto', gap: '1rem', padding: '.85rem', alignItems: 'center' }}>
                      <div style={{ borderRadius: 10, overflow: 'hidden' }}><CatalogImage src={card.imageUrl} alt={displayName} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.7rem', alignItems: 'flex-start' }}>
                          <div><h4 style={{ margin: 0, color: '#fff', fontSize: '1.08rem', lineHeight: 1.25, display: 'block' }}>{displayName}</h4><span style={{ color: 'var(--accent)', fontSize: '.72rem', fontWeight: 700 }}>{catalogCategory === 'mekan' ? 'Yemek kartı' : catalogCategory === 'film' ? 'Film / dizi kartı' : 'Aktivite kartı'}</span></div>
                        </div>
                        <p style={{ margin: '.35rem 0 .65rem', color: 'var(--text-muted)', fontSize: '.84rem', lineHeight: 1.45 }}>{card.description || 'Bu kart için henüz bir açıklama girilmedi.'}</p>
                        <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '.74rem' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Heart size={12} fill="#ff6b6b" color="#ff6b6b" /> {likes} beğeni</span><span>{swipes} oy{likeRate !== null ? ` · %${likeRate}` : ''}</span>{card.budget && <span>{card.budget}</span>}{card.platform && <span>{card.platform}</span>}</div>
                      </div>
                      <button type="button" onClick={() => editingCard === editorKey ? setEditingCard(null) : startCatalogEdit(card, editorKey)} style={{ border: '1px solid rgba(255,255,255,.16)', borderRadius: 8, padding: '.55rem', color: 'white', background: 'rgba(255,255,255,.06)', cursor: 'pointer', alignSelf: 'start' }} title="Kartı düzenle"><Pencil size={16} /></button>
                      <div style={{ gridColumn: '1 / -1', padding: '0 .2rem' }}>
                        {editingCard === editorKey && <div style={{ display: 'grid', gap: '.5rem', marginTop: '.8rem', paddingTop: '.8rem', borderTop: '1px solid rgba(255,255,255,.1)' }}>
                          {[['name', 'Kart adı'], ['imageUrl', 'Görsel URL'], ['description', 'Açıklama'], ['mapsQuery', 'Harita araması'], ['budget', 'Bütçe'], ['platform', 'Platform'], ['imdbScore', 'IMDb puanı'], ['duration', 'Süre']].map(([field, label]) => <label key={`${editorKey}-${field}`} style={{ color: 'var(--text-muted)', fontSize: '.7rem' }}>{label}<input value={catalogDraft[field] ?? ''} onChange={(event) => setCatalogDraft(prev => ({ ...prev, [field]: event.target.value }))} style={{ width: '100%', boxSizing: 'border-box', marginTop: '.25rem', padding: '.5rem', borderRadius: 7, color: 'white', background: '#101a2d', border: '1px solid rgba(255,255,255,.16)' }} /></label>)}
                          <div style={{ display: 'flex', gap: '.5rem' }}><button onClick={() => saveCatalogCard(card)} disabled={savingCatalogCard} style={{ flex: 1, border: 0, borderRadius: 7, padding: '.55rem', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>{savingCatalogCard ? 'Kaydediliyor...' : 'Kaydet'}</button><button onClick={() => setEditingCard(null)} style={{ border: '1px solid rgba(255,255,255,.16)', borderRadius: 7, padding: '.55rem .75rem', background: 'transparent', color: 'white', cursor: 'pointer' }}>Vazgeç</button></div>
                        </div>}
                      </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {/* ===== EVENTS TAB ===== */}
        {activeTab === 'events' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>📋 Toplu Etkinlik Yapıştır (JSON Import)</h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Geçerli bir JSON array yapıştırın. Zorunlu alanlar: <code style={{ color: 'var(--primary)' }}>title</code>, <code style={{ color: 'var(--primary)' }}>ticketUrl</code>.
            </p>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="[\n  {\n    &#34;title&#34;: &#34;Örnek Konser&#34;,\n    &#34;ticketUrl&#34;: &#34;https://...&#34;,\n    &#34;city&#34;: &#34;İstanbul&#34;,\n    &#34;category&#34;: &#34;Konser&#34;\n  }\n]"
              style={{
                width: '100%', height: '250px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                borderRadius: '8px', padding: '1rem', fontFamily: 'monospace',
                fontSize: '0.85rem', resize: 'vertical', marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={clearOld} 
                  onChange={(e) => setClearOld(e.target.checked)} 
                  style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                />
                Eski etkinlikleri temizle (Sadece JSON'daki veriler kalır)
              </label>

              <button
                onClick={handleImportEvents}
                disabled={isImporting || !jsonInput.trim()}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  padding: '0.7rem 1.5rem', borderRadius: '8px', fontWeight: 600,
                  cursor: isImporting || !jsonInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: isImporting || !jsonInput.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                {isImporting ? '⏳ İşleniyor...' : '🚀 Verileri İçeri Aktar ve DB\'yi Güncelle'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPanel;
