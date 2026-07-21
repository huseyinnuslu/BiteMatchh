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
        <div style={{ marginBottom: '2rem' }}>

          {/* Başlık */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', padding: '0 0.25rem' }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#ef4444', display: 'inline-block',
              boxShadow: '0 0 10px #ef4444',
              animation: 'blink 1.4s ease-in-out infinite',
            }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
              Yaklaşan Etkinlikler
            </h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Her gece güncellenir
            </span>
          </div>

          {eventsLoading ? (
            /* Skeleton */
            <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  minWidth: 175, height: 240, borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                  flexShrink: 0, animation: 'shimmer 1.6s linear infinite',
                }} />
              ))}
            </div>
          ) : (
            /* Kartlar */
            <div style={{
              display: 'flex', gap: '0.85rem',
              overflowX: 'auto', overflowY: 'visible',
              paddingBottom: '1rem', paddingTop: '0.5rem',
              paddingLeft: '2px', paddingRight: '16px',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              cursor: 'grab',
            }}>
              {liveEvents.map((ev, i) => (
                <div
                  key={ev._id || i}
                  onClick={() => {
                    const url = ev.ticketUrl || (ev.mapsQuery && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.mapsQuery)}`);
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                  style={{
                    minWidth: 175, maxWidth: 175, height: 250,
                    borderRadius: '18px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                  }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {/* Görsel arka plan */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: ev.imageUrl
                      ? `url(${ev.imageUrl})`
                      : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />

                  {/* Gradient overlay — altta okunabilir text için */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.92) 100%)',
                  }} />

                  {/* Kaynak badge — sol üst */}
                  {ev.eventSource && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(6px)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.65rem', fontWeight: 700,
                      color: 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.03em',
                    }}>
                      {ev.eventSource}
                    </div>
                  )}

                  {/* Bilet badge — sağ üst (ticketUrl varsa) */}
                  {ev.ticketUrl && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'var(--primary)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.6rem', fontWeight: 800,
                      color: 'white', letterSpacing: '0.04em',
                    }}>
                      🎟 BİLET
                    </div>
                  )}

                  {/* Alt içerik */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '0.85rem 0.9rem 0.9rem',
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                  }}>
                    {/* Etkinlik adı */}
                    <p style={{
                      margin: 0, fontWeight: 800,
                      fontSize: '0.92rem', color: 'white', lineHeight: 1.25,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {ev.name}
                    </p>

                    {/* Tarih rozeti */}
                    {ev.eventDate && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(99,102,241,0.85)',
                        borderRadius: '6px', padding: '0.2rem 0.5rem',
                        fontSize: '0.7rem', fontWeight: 700, color: 'white',
                        alignSelf: 'flex-start',
                      }}>
                        <CalendarDays size={10} />
                        {formatDate(ev.eventDate)}
                      </div>
                    )}

                    {/* Mekan */}
                    {ev.location && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)',
                      }}>
                        <MapPin size={10} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.location}
                        </span>
                      </div>
                    )}

                    {/* CTA butonu */}
                    <div style={{
                      marginTop: '0.3rem',
                      padding: '0.45rem',
                      borderRadius: '10px',
                      background: ev.ticketUrl
                        ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                        : 'rgba(66,133,244,0.3)',
                      color: 'white',
                      fontSize: '0.75rem', fontWeight: 800,
                      textAlign: 'center',
                      boxShadow: ev.ticketUrl ? '0 2px 10px rgba(99,102,241,0.5)' : 'none',
                    }}>
                      {ev.ticketUrl ? '🎟 Bilet Al' : '📍 Haritada Gör'}
                    </div>
                  </div>
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
