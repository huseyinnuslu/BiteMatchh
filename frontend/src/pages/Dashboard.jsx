import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomContext } from '../context/RoomContext';
import { Plus, Trash2, Loader, Utensils, Film, Tent, Edit3, CalendarDays, MapPin, Zap, Send } from 'lucide-react';
import RoomCard from '../components/RoomCard';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../socket/socketClient';
import { toast } from 'react-toastify';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [cityFilter, setCityFilter] = useState('Tümü');

  const CITIES = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];

  // Filtrelenmiş etkinlikler: öne çıkanlar önce, sonra tarihe göre
  const filteredEvents = liveEvents
    .filter(ev => cityFilter === 'Tümü' || ev.city === cityFilter)
    .sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(a.eventDate) - new Date(b.eventDate);
    });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Yatay scroll drag-to-scroll ref'leri
  const scrollRef   = useRef(null);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const scrollStart = useRef(0);
  const didDrag     = useRef(false); // drag mi yoksa click mi?

  const { createRoom, loading, getMyRooms, deleteRoom } = useContext(RoomContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Paylaşım/Gönderim state'leri
  const [shareModalOpen, setShareModalOpen]   = useState(false);
  const [eventToShare, setEventToShare]       = useState(null);
  const [friends, setFriends]                 = useState([]);
  const [loadingFriends, setLoadingFriends]   = useState(false);
  const [shareMessage, setShareMessage]       = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState(null);

  const handleShareClick = async (ev) => {
    setEventToShare(ev);
    setShareModalOpen(true);
    setLoadingFriends(true);
    try {
      const { data } = await api.get('/users/friends');
      setFriends(data);
    } catch {
      toast.error('Arkadaşlar yüklenemedi.');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendShare = () => {
    if (!selectedFriendId || !eventToShare) return;
    const socket = getSocket();
    if (!socket) {
      toast.error('Socket bağlantısı aktif değil.');
      return;
    }
    socket.emit('send_direct_message', {
      toUserId: selectedFriendId,
      text: shareMessage,
      senderName: user.username,
      sharedEvent: {
        name: eventToShare.name,
        imageUrl: eventToShare.imageUrl,
        location: eventToShare.location,
        ticketUrl: eventToShare.ticketUrl,
        mapsQuery: eventToShare.mapsQuery || eventToShare.location,
      }
    });
    toast.success('Etkinlik DM üzerinden paylaşıldı! ✈️');
    setShareModalOpen(false);
    setShareMessage('');
    setSelectedFriendId(null);
  };

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
    <div className="animate-slide-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '0 1rem', paddingBottom: '4rem', boxSizing: 'border-box' }}>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0.75rem' : '1rem', marginBottom: '1.5rem' }}>
            
            <div 
              onClick={() => setCategory('mekan')} 
              style={{ padding: isMobile ? '0.75rem 0.5rem' : '1rem', borderRadius: '12px', border: `2px solid ${category === 'mekan' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'mekan' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Utensils size={isMobile ? 24 : 30} color={category === 'mekan' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '1rem', color: category === 'mekan' ? 'var(--primary)' : 'white' }}>Ne Yiyelim?</h4>
            </div>

            <div 
              onClick={() => setCategory('film')} 
              style={{ padding: isMobile ? '0.75rem 0.5rem' : '1rem', borderRadius: '12px', border: `2px solid ${category === 'film' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'film' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Film size={isMobile ? 24 : 30} color={category === 'film' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '1rem', color: category === 'film' ? 'var(--primary)' : 'white' }}>Ne İzleyelim?</h4>
            </div>

            <div 
              onClick={() => setCategory('aktivite')} 
              style={{ padding: isMobile ? '0.75rem 0.5rem' : '1rem', borderRadius: '12px', border: `2px solid ${category === 'aktivite' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'aktivite' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Tent size={isMobile ? 24 : 30} color={category === 'aktivite' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '1rem', color: category === 'aktivite' ? 'var(--primary)' : 'white' }}>Ne Yapalım?</h4>
            </div>

            <div 
              onClick={() => setCategory('custom')} 
              style={{ padding: isMobile ? '0.75rem 0.5rem' : '1rem', borderRadius: '12px', border: `2px solid ${category === 'custom' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, background: category === 'custom' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            >
              <Edit3 size={isMobile ? 24 : 30} color={category === 'custom' ? 'var(--primary)' : 'white'} style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '1rem', color: category === 'custom' ? 'var(--primary)' : 'white' }}>Kendi Listeni Yarat</h4>
            </div>

          </div>

          {/* Bütçe Sınırlaması Seçimi */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Bütçe Aralığı (Çoklu Seçim)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '0.5rem' : '0.8rem' }}>
              
              <div 
                onClick={() => handleBudgetToggle('₺')}
                style={{
                  padding: isMobile ? '0.75rem 0.25rem' : '1rem 0.5rem',
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
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺') ? 'var(--primary)' : 'white' }}>₺</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Öğrenci Dostu / Hızlı Yemek</span>
              </div>

              <div 
                onClick={() => handleBudgetToggle('₺₺')}
                style={{
                  padding: isMobile ? '0.75rem 0.25rem' : '1rem 0.5rem',
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
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺₺') ? 'var(--primary)' : 'white' }}>₺₺</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Standart Kafe & Restoran</span>
              </div>

              <div 
                onClick={() => handleBudgetToggle('₺₺₺')}
                style={{
                  padding: isMobile ? '0.75rem 0.25rem' : '1rem 0.5rem',
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
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 'bold', color: priceRange.includes('₺₺₺') ? 'var(--primary)' : 'white' }}>₺₺₺</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.2' }}>Premium / Gurme</span>
              </div>

            </div>
            <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
              * Seçim yapılmazsa tüm bütçeler dahil edilir. Birden fazla bütçe seçebilirsiniz.
            </small>
          </div>

          {/* Oylama Süre Sınırı Seçimi */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Oylama Süresi Sınırı</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: isMobile ? '0.4rem' : '0.6rem' }}>
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
                    padding: isMobile ? '0.6rem 0.1rem' : '0.85rem 0.2rem',
                    borderRadius: '12px',
                    border: `2px solid ${timeLimit === timeOpt.value ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                    background: timeLimit === timeOpt.value ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    fontSize: isMobile ? '0.72rem' : '0.85rem',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
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
              via Bubilet
            </span>
          </div>

          {/* Şehir Filtresi Pills */}
          <div style={{
            display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem',
            marginBottom: '0.75rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          }}>
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                style={{
                  padding: '0.3rem 0.85rem',
                  borderRadius: '20px',
                  border: `1.5px solid ${cityFilter === city ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
                  background: cityFilter === city ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: cityFilter === city ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.72rem', fontWeight: cityFilter === city ? 700 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.18s',
                }}
              >{city}</button>
            ))}
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
            <div
              ref={scrollRef}
              style={{
                display: 'flex', gap: '0.85rem',
                overflowX: 'auto', overflowY: 'visible',
                paddingBottom: '1rem', paddingTop: '0.5rem',
                paddingLeft: '2px', paddingRight: '16px',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                cursor: 'grab',
                userSelect: 'none',
              }}
              onMouseDown={e => {
                isDragging.current  = true;
                didDrag.current     = false;
                dragStartX.current  = e.pageX - scrollRef.current.offsetLeft;
                scrollStart.current = scrollRef.current.scrollLeft;
                scrollRef.current.style.cursor = 'grabbing';
              }}
              onMouseMove={e => {
                if (!isDragging.current) return;
                e.preventDefault();
                const x    = e.pageX - scrollRef.current.offsetLeft;
                const walk = (x - dragStartX.current) * 1.4;
                if (Math.abs(walk) > 4) didDrag.current = true;
                scrollRef.current.scrollLeft = scrollStart.current - walk;
              }}
              onMouseUp={()    => { isDragging.current = false; scrollRef.current.style.cursor = 'grab'; }}
              onMouseLeave={()  => { isDragging.current = false; scrollRef.current.style.cursor = 'grab'; }}
            >
              {filteredEvents.length === 0 && !eventsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0.25rem' }}>
                {cityFilter === 'Tümü' ? 'Henüz etkinlik yok.' : `${cityFilter} için etkinlik bulunamadı.`}
              </div>
            ) : filteredEvents.map((ev, i) => (
                <div
                  key={ev._id || i}
                  style={{
                    minWidth: 185, maxWidth: 185, height: 270,
                    borderRadius: '18px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    position: 'relative',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    if (didDrag.current) return;
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                  }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onTouchEnd={e   => { e.currentTarget.style.transform = 'scale(1)'; }}
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

                  {/* Kaynak / Platform rozeti — sol üst */}
                  {(() => {
                    const tUrl = ev.ticketUrl || '';
                    let label, bg;
                    if (tUrl.includes('bubilet.com.tr')) {
                      label = '🎟 Bubilet'; bg = 'rgba(220,38,38,0.88)';
                    } else if (tUrl.includes('passo.com.tr')) {
                      label = '🎟 Passo'; bg = 'rgba(234,88,12,0.85)';
                    } else if (tUrl.includes('biletix.com')) {
                      label = '🎟 Biletix'; bg = 'rgba(37,99,235,0.85)';
                    } else if (tUrl.includes('biletinial.com')) {
                      label = '🎟 Biletinial'; bg = 'rgba(124,58,237,0.85)';
                    } else if (ev.eventSource === 'IBB') {
                      label = '🏛 IBB'; bg = 'rgba(4,120,87,0.85)';
                    } else if (ev.eventSource === 'Eventbrite') {
                      label = '📍 Eventbrite'; bg = 'rgba(248,113,113,0.7)';
                    } else {
                      label = ev.city ? `📍 ${ev.city}` : '🎯 Etkinlik'; bg = 'rgba(0,0,0,0.6)';
                    }
                    return (
                      <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: bg, backdropFilter: 'blur(6px)',
                        borderRadius: '6px', padding: '0.2rem 0.5rem',
                        fontSize: '0.62rem', fontWeight: 700,
                        color: 'rgba(255,255,255,0.95)', letterSpacing: '0.03em',
                      }}>{label}</div>
                    );
                  })()}

                  {/* Öne Çıkan yıldız — sağ üst sol tarafı (ticketUrl yokken en sağda) */}
                  {ev.isFeatured && (
                    <div style={{
                      position: 'absolute', top: 10,
                      right: ev.ticketUrl ? 60 : 10,
                      background: 'rgba(251,191,36,0.9)',
                      borderRadius: '6px', padding: '0.2rem 0.4rem',
                      fontSize: '0.6rem', fontWeight: 800, color: '#1a1a1a',
                    }}>⭐ ÖNE ÇIKAN</div>
                  )}

                  {/* Bilet badge — sağ üst: sadece gerçek bir ticketUrl varsa */}
                  {ev.ticketUrl && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'var(--primary)',
                      borderRadius: '6px', padding: '0.2rem 0.45rem',
                      fontSize: '0.6rem', fontWeight: 800,
                      color: 'white', letterSpacing: '0.04em',
                    }}>
                      🎟 BİLET
                    </div>
                  )}

                  {/* Share/Send Button — sağ üst */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(ev);
                    }}
                    style={{
                      position: 'absolute', top: 10, right: ev.ticketUrl ? 65 : 10,
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={el => { el.currentTarget.style.background = 'var(--primary)'; el.currentTarget.style.color = 'black'; }}
                    onMouseLeave={el => { el.currentTarget.style.background = 'rgba(0,0,0,0.6)'; el.currentTarget.style.color = 'white'; }}
                  >
                    <Send size={13} />
                  </button>

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

                    {/* CTA: Bilet Al + Haritada Gör */}
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem' }}>
                      {ev.ticketUrl && (
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            if (!didDrag.current) window.open(ev.ticketUrl, '_blank', 'noopener,noreferrer');
                          }}
                          style={{
                            flex: 1, padding: '0.45rem 0.25rem',
                            borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white', fontSize: '0.7rem', fontWeight: 800,
                            cursor: 'pointer', textAlign: 'center',
                            boxShadow: '0 2px 10px rgba(99,102,241,0.5)',
                            transition: 'opacity 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          🎟 Bilet Al
                        </button>
                      )}
                      {(ev.mapsQuery || ev.location) && (
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            if (!didDrag.current) {
                              const q = encodeURIComponent(ev.mapsQuery || ev.location);
                              window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          style={{
                            flex: 1, padding: '0.45rem 0.25rem',
                            borderRadius: '10px', border: 'none',
                            background: ev.ticketUrl ? 'rgba(66,133,244,0.25)' : 'rgba(66,133,244,0.55)',
                            color: 'white', fontSize: '0.7rem', fontWeight: 800,
                            cursor: 'pointer', textAlign: 'center',
                            transition: 'opacity 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          📍 Harita
                        </button>
                      )}
                      {!ev.ticketUrl && !ev.mapsQuery && !ev.location && (
                        <div style={{
                          flex: 1, padding: '0.45rem',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem',
                          textAlign: 'center',
                        }}>
                          Detay Yok
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paylaşım Modalı */}
      {shareModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }} onClick={() => setShareModalOpen(false)}>
          <div style={{
            width: '100%', maxWidth: '440px', borderRadius: '20px',
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                ✈️ Etkinliği Paylaş
              </h3>
              <button onClick={() => setShareModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
            </div>
            {/* Body */}
            <div style={{ padding: '1.25rem', maxHeight: '350px', overflowY: 'auto' }}>
              {/* Event preview */}
              <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={eventToShare?.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200'} alt="" style={{ width: 60, height: 60, borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventToShare?.name}</h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventToShare?.location}</p>
                </div>
              </div>

              {/* Message Input */}
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem' }}>Mesajın (Opsiyonel)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Örn: Buna gidelim mi? 🥳" 
                  value={shareMessage}
                  onChange={e => setShareMessage(e.target.value)}
                />
              </div>

              {/* Friend list */}
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gönderilecek Arkadaş Seçin</label>
              {loadingFriends ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader className="spin" size={20} /></div>
              ) : friends.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '1rem 0' }}>Henüz arkadaşınız yok.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {friends.map(f => (
                    <div 
                      key={f._id} 
                      onClick={() => setSelectedFriendId(f._id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '0.75rem',
                        padding: '0.6rem 0.8rem', borderRadius: '10px',
                        background: selectedFriendId === f._id ? 'rgba(255, 75, 75, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedFriendId === f._id ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 'bold', color: 'white'
                      }}>
                        {f.username?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.88rem', color: 'white' }}>@{f.username}</span>
                      {selectedFriendId === f._id && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Seçildi</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShareModalOpen(false)} style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>İptal</button>
              <button 
                onClick={handleSendShare} 
                disabled={!selectedFriendId} 
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', opacity: selectedFriendId ? 1 : 0.5, cursor: selectedFriendId ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }}
              >
                Gönder ✈️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
