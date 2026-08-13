import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CalendarDays, MapPin, Users, Loader, ArrowLeft, ExternalLink, Trash2, History } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';
import { preloadImages, resolveAssetUrl } from '../utils/imageCache';

const MatchHistory = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/rooms/history');
        setMatches(data);
        preloadImages(data.flatMap((room) => [room.matchResult?.imageUrl, room.matchResult?.fallbackImageUrl]));
      } catch (err) {
        console.error('Eşleşme geçmişi yüklenirken hata oluştu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const requestDeleteMatch = (roomId) => {
    setDeleteTarget(roomId);
    setShowConfirm(true);
  };

  const requestBulkDelete = () => {
    if (selectedMatches.length === 0) return;
    setDeleteTarget('bulk');
    setShowConfirm(true);
  };

  const executeDelete = async () => {
    setShowConfirm(false);
    
    if (deleteTarget === 'bulk') {
      setLoading(true);
      try {
        await Promise.all(selectedMatches.map(id => api.delete(`/rooms/${id}`)));
        setMatches(matches => matches.filter(m => !selectedMatches.includes(m._id)));
        setSelectedMatches([]);
        toast.success('Seçilen eşleşmeler başarıyla silindi.');
      } catch (error) {
        toast.error('Toplu silme işlemi sırasında bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    } else if (deleteTarget) {
      try {
        const res = await api.delete(`/rooms/${deleteTarget}`);
        if (res.status === 200) {
          setMatches(matches => matches.filter(m => m._id !== deleteTarget));
          setSelectedMatches(prev => prev.filter(id => id !== deleteTarget));
          toast.success('Eşleşme geçmişinizden silindi.');
        }
      } catch (error) {
        console.error('Silme hatası:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Silinirken bir hata oluştu.');
      }
    }
  };

  const toggleSelection = (roomId) => {
    setSelectedMatches(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const getPartnerList = (room) => {
    if (!room.participants || !user) return '';
    const otherParticipants = room.participants.filter(
      (p) => p._id?.toString() !== user._id?.toString()
    );
    if (otherParticipants.length === 0) return 'Yalnız (Tek Kişilik Oda)';
    return otherParticipants.map((p) => `@${p.username}`).join(', ');
  };

  return (
    <div className="animate-slide-up" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '1rem', paddingBottom: '4rem', boxSizing: 'border-box' }}>
      
      {/* Üst Kısım: Geri Dön ve Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(135deg, #fff 40%, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Eşleşme Geçmişim
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Daha önce odalarda başarıyla ortak karar verdiğiniz etkinlik ve mekanlar
          </p>
        </div>
        {selectedMatches.length > 0 && (
          <button
            onClick={requestBulkDelete}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '0.6rem 1.2rem',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Trash2 size={16} /> Seçilenleri Sil ({selectedMatches.length})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <Loader className="spin" size={32} color="var(--primary)" />
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
          <History size={64} style={{ opacity: 0.2, marginBottom: '1.5rem', color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '320px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Henüz hiç eşleşmen yok. Ortak kararlar almak için hemen bir oda kur!
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
            Hemen Oda Kur / Keşfet
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {matches.map((room) => {
            const partnerText = getPartnerList(room);
            const winner = room.matchResult;
            
            return (
              <div 
                key={room._id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: window.innerWidth <= 640 ? 'column' : 'row',
                  gap: '1.5rem',
                  padding: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  position: 'relative'
                }}
              >
                {/* Checkbox */}
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedMatches.includes(room._id)}
                    onChange={() => toggleSelection(room._id)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: 'var(--primary)', margin: 0 }}
                  />
                </div>
                {/* Silme Butonu */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    onClick={() => requestDeleteMatch(room._id)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      color: '#ef4444', 
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Bu geçmişi sil"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {/* Sol / Üst: Etkinlik Resmi */}
                <div style={{ 
                  width: window.innerWidth <= 640 ? '100%' : '180px',
                  height: '140px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                }}>
                  {winner?.imageUrl ? (
                    <img 
                      src={resolveAssetUrl(winner.imageUrl)}
                      alt={winner.name} 
                      loading="eager"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%', 
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      Görsel Yok
                    </div>
                  )}
                  {/* Kategori Rozeti */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    fontSize: '0.65rem',
                    padding: '0.2rem 0.5rem',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    color: 'var(--primary)',
                    fontWeight: 700,
                  }}>
                    {room.category && room.category !== 'custom' ? room.category : 'Özel'}
                  </span>
                </div>

                {/* Sağ / Alt: Bilgiler ve Butonlar */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                  <div>
                    {/* Oda ismi ve Eşleşme Tarihi */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                          {room.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <CalendarDays size={13} />
                          {formatDate(room.updatedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Katılımcılar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <Users size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Eşleşilen: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{partnerText}</strong>
                      </span>
                    </div>

                    {/* Eşleşme Sonucu Kart Detayı */}
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      border: '1px solid rgba(255, 255, 255, 0.05)', 
                      borderRadius: '10px', 
                      padding: '0.75rem 1rem', 
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                          🏆 {winner?.name || 'Bilinmeyen Seçenek'}
                        </h4>
                        {winner?.budget && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                            {winner.budget}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {winner?.description || 'Açıklama bulunmuyor.'}
                      </p>
                    </div>
                  </div>

                  {/* Butonlar */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {winner?.ticketUrl && (
                      <button
                        onClick={() => window.open(winner.ticketUrl, '_blank', 'noopener,noreferrer')}
                        style={{
                          flex: 1, minWidth: '120px', padding: '0.55rem 1rem',
                          borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          color: 'white', fontSize: '0.8rem', fontWeight: 800,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      >
                        🎟 Bilet Sayfasına Git <ExternalLink size={12} />
                      </button>
                    )}
                    {(winner?.location || winner?.mapsQuery) && (
                      <button
                        onClick={() => {
                          const q = encodeURIComponent(winner.mapsQuery || winner.location);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          flex: 1, minWidth: '120px', padding: '0.55rem 1rem',
                          borderRadius: '8px', border: 'none',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          color: '#8ab4f8', fontSize: '0.8rem', fontWeight: 800,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(66, 133, 244, 0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)'; }}
                      >
                        📍 Haritada Göster <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showConfirm && (
        <ConfirmModal
          icon="🗑️"
          title="Silmeyi Onayla"
          message={deleteTarget === 'bulk' ? `Seçilen ${selectedMatches.length} geçmiş eşleşmeyi silmek istediğinize emin misiniz?` : "Bu eşleşmeyi geçmişinizden silmek istediğinize emin misiniz?"}
          confirmText="Evet, Sil"
          onConfirm={executeDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

export default MatchHistory;
