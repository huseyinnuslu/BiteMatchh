import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomContext } from '../context/RoomContext';
import { Plus, Trash2, Loader, Utensils, Film, Tent, Edit3, CalendarDays, MapPin, Zap } from 'lucide-react';
import RoomCard from '../components/RoomCard';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';

const Dashboard = () => {
  const [roomName, setRoomName] = useState('');
  const [category, setCategory] = useState('mekan');
  const [options, setOptions] = useState([{ name: '' }, { name: '' }]);
  const [priceRange, setPriceRange] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [timeLimit, setTimeLimit] = useState(0);
  const [liveEvents, setLiveEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const { createRoom, loading, getMyRooms, deleteRoom } = useContext(RoomContext);
  const navigate = useNavigate();

  const handleBudgetToggle = (budgetSymbol) => {
    if (priceRange.includes(budgetSymbol)) {
      setPriceRange(priceRange.filter(b => b !== budgetSymbol));
    } else {
      setPriceRange([...priceRange, budgetSymbol]);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const rooms = await getMyRooms();
      setMyRooms(rooms);
      try {
        const { data } = await api.get('/events/live');
        setLiveEvents(data);
      } catch {
        setLiveEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].name = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { name: '' }]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let validOptions = [];
    if (category === 'custom') {
      validOptions = options.filter(opt => opt.name.trim() !== '');
      if (validOptions.length < 2) return;
    }

    const result = await createRoom(roomName, validOptions, category, priceRange, timeLimit);
    if (result.success) {
      navigate(`/room/${result.roomId}`);
    }
  };

  const handleDeleteClick = (roomId) => {
    setRoomToDelete(roomId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    const success = await deleteRoom(roomToDelete);
    if (success) {
      setMyRooms(myRooms.filter(r => r._id !== roomToDelete));
    }
    setIsDeleteModalOpen(false);
    setRoomToDelete(null);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRoomToDelete(null);
  };

  return (
    <div className="animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '4rem' }}>

      {/* ── Keşfet Başlık ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
        }}>
          <Zap size={22} color="white" fill="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.7rem', background: 'linear-gradient(135deg, #fff 40%, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Keşfet</h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Yeni bir oda kur, etkinliklere göz at</p>
        </div>
      </div>
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Yeni Oda Kur</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Oda Adı</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Örn: Cuma Akşamı, Film Gecesi..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required 
            />
          </div>

          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Ne Hakkında Karar Vereceksiniz?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            
            <div 
              onClick={() => setCategory('mekan')} 
              style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${category === 'mekan' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'mekan' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Utensils size={30} color={category === 'mekan' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', color: category === 'mekan' ? 'var(--primary)' : 'white' }}>Ne Yiyelim?</h4>
            </div>

            <div 
              onClick={() => setCategory('film')} 
              style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${category === 'film' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'film' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Film size={30} color={category === 'film' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', color: category === 'film' ? 'var(--primary)' : 'white' }}>Ne İzleyelim?</h4>
            </div>

            <div 
              onClick={() => setCategory('aktivite')} 
              style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${category === 'aktivite' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'aktivite' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Tent size={30} color={category === 'aktivite' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', color: category === 'aktivite' ? 'var(--primary)' : 'white' }}>Ne Yapalım?</h4>
            </div>

            <div 
              onClick={() => setCategory('custom')} 
              style={{ padding: '1rem', borderRadius: '12px', border: `2px solid ${category === 'custom' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'custom' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Edit3 size={30} color={category === 'custom' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', color: category === 'custom' ? 'var(--primary)' : 'white' }}>Kendi Listeni Yarat</h4>
            </div>

          </div>

          {/* Bütçe Sınırlaması Seçimi */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Bütçe Aralığı (Çoklu Seçim)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
              
              <div 
                onClick={() => handleBudgetToggle('₺')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${priceRange.includes('₺') ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                  background: priceRange.includes('₺') ? 'rgba(255, 75, 75, 0.15)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: priceRange.includes('₺') ? '0 0 12px rgba(255, 75, 75, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺') ? 'var(--primary)' : 'white' }}>₺</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Öğrenci Dostu / Hızlı Yemek</span>
              </div>

              <div 
                onClick={() => handleBudgetToggle('₺₺')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${priceRange.includes('₺₺') ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                  background: priceRange.includes('₺₺') ? 'rgba(255, 75, 75, 0.15)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: priceRange.includes('₺₺') ? '0 0 12px rgba(255, 75, 75, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺₺') ? 'var(--primary)' : 'white' }}>₺₺</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Standart Kafe & Restoran</span>
              </div>

              <div 
                onClick={() => handleBudgetToggle('₺₺₺')}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${priceRange.includes('₺₺₺') ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                  background: priceRange.includes('₺₺₺') ? 'rgba(255, 75, 75, 0.15)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: priceRange.includes('₺₺₺') ? '0 0 12px rgba(255, 75, 75, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺₺₺') ? 'var(--primary)' : 'white' }}>₺₺₺</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Premium / Gurme</span>
              </div>

            </div>
            <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
              * Seçim yapılmazsa tüm bütçeler dahil edilir. Birden fazla bütçe seçebilirsiniz.
            </small>
          </div>

          {/* Oylama Süre Sınırı Seçimi */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Oylama Süresi Sınırı</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.6rem' }}>
              {[
                { label: '30 Saniye', value: 30 },
                { label: '1 Dakika', value: 60 },
                { label: '2 Dakika', value: 120 },
                { label: 'Sınırsız', value: 0 }
              ].map(timeOpt => (
                <div 
                  key={timeOpt.value}
                  onClick={() => setTimeLimit(timeOpt.value)}
                  style={{
                    padding: '0.85rem 0.2rem',
                    borderRadius: '12px',
                    border: `2px solid ${timeLimit === timeOpt.value ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                    background: timeLimit === timeOpt.value ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    fontSize: '0.85rem',
                    color: timeLimit === timeOpt.value ? 'var(--primary)' : 'white',
                    fontWeight: timeLimit === timeOpt.value ? 'bold' : 'normal',
                    boxShadow: timeLimit === timeOpt.value ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                >
                  {timeOpt.label}
                </div>
              ))}
            </div>
          </div>

          {category === 'custom' && (
            <div className="animate-slide-up" style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Özel Seçeneklerin</label>
              {options.map((opt, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder={`Seçenek ${index + 1}`}
                    value={opt.name}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    required
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(index)} className="btn btn-outline" style={{ padding: '0.875rem' }}>
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOption} className="btn" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', width: '100%', marginTop: '0.5rem' }}>
                <Plus size={20} style={{ marginRight: '0.5rem' }} /> Seçenek Ekle
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary pulse-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} disabled={loading}>
            {loading ? <Loader className="spin" size={24} /> : 'Odayı Başlat'}
          </button>
        </form>
      </div>

      {/* ── Canlı Etkinlikler Widget ──────────────────────────────────── */}
      {(eventsLoading || liveEvents.length > 0) && (
        <div className="glass-card" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Yaklaşan Etkinlikler</h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Her gece güncellenir</span>
          </div>

          {eventsLoading ? (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ minWidth: 200, height: 120, borderRadius: '14px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollbarWidth: 'thin' }}>
              {liveEvents.map((ev, i) => (
                <div key={i} style={{
                  minWidth: 210, maxWidth: 210,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px', padding: '1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s',
                  flexShrink: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  {/* Etkinlik adı */}
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'white', lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ev.name}
                  </p>

                  {/* Tarih */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--primary)' }}>
                    <CalendarDays size={13} />
                    {formatDate(ev.eventDate)}
                  </div>

                  {/* Konum */}
                  {ev.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <MapPin size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</span>
                    </div>
                  )}

                  {/* Kaynak badge */}
                  {ev.eventSource && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '6px', alignSelf: 'flex-start' }}>
                      {ev.eventSource}
                    </span>
                  )}

                  {/* Harita butonu */}
                  {ev.mapsQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.mapsQuery)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.4rem', borderRadius: '8px', background: 'rgba(66,133,244,0.15)',
                        color: '#93c5fd', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                        transition: 'background 0.2s',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <MapPin size={13} /> Haritada Gör
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Geçmiş Odalarım</h3>
        {myRooms.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Henüz kurduğunuz bir oda bulunmuyor.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myRooms.map(room => (
              <RoomCard
                key={room._id}
                room={room}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* ConfirmModal bileşeni kullanıldı */}
      {isDeleteModalOpen && (
        <ConfirmModal
          icon="🗑️"
          title="Odayı Sil"
          message="Bu odayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmText="Evet, Sil"
          confirmColor="#ef4444"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};

export default Dashboard;
