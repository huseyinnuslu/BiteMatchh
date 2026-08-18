import { useNavigate } from 'react-router-dom';
import { Award, LogIn, Trash2 } from 'lucide-react';

/**
 * RoomCard Bileşeni
 * Dashboard'da "Geçmiş Odalarım" listesinde her odayı gösteren kart.
 * Props:
 *   - room: Oda nesnesi { _id, name, category, status, matchResult }
 *   - onDelete: Silme butonuna tıklandığında çağrılan fonksiyon (roomId alır)
 */
const RoomCard = ({ room, onDelete }) => {
  const navigate = useNavigate();

  // Durum etiketi
  const statusLabel =
    room.status === 'voting' ? 'Oylamada' :
    room.status === 'finished' ? 'Tamamlandı' : 'Beklemede';

  const statusColor =
    room.status === 'voting' ? '#fbbf24' :
    room.status === 'finished' ? '#4ade80' : '#94a3b8';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      transition: 'background 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    >
      {/* Sol: Bilgiler */}
      <div>
        <h4 style={{ margin: 0, textTransform: 'capitalize', fontWeight: 700 }}>
          {room.name}
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Kategori etiketi — boş veya 'custom' ise 'Özel' göster */}
          <span style={{
            fontSize: '0.73rem', padding: '0.2rem 0.6rem',
            background: 'var(--surface)', borderRadius: '4px',
            textTransform: 'uppercase', color: 'var(--primary)',
            fontWeight: 600,
          }}>
            {room.category && room.category !== 'custom' ? room.category : 'Özel'}
          </span>
          {/* Durum etiketi */}
          <span style={{
            fontSize: '0.73rem', padding: '0.2rem 0.6rem',
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}44`,
            borderRadius: '4px', color: statusColor, fontWeight: 600,
          }}>
            {statusLabel}
          </span>
          {/* Kazanan */}
          {room.status === 'finished' && room.matchResult && (
            <span style={{
              fontSize: '0.73rem', padding: '0.2rem 0.6rem',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid var(--success)',
              borderRadius: '4px', color: 'var(--success)',
            }}>
              <Award size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />{room.matchResult.name}
            </span>
          )}
        </div>
      </div>

      {/* Sağ: Butonlar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => navigate(`/room/${room._id}`)}
          className="btn"
          title="Odaya Git"
          style={{ padding: '0.5rem', background: 'var(--primary)', color: 'black' }}
        >
          <LogIn size={18} />
        </button>
        <button
          onClick={() => onDelete(room._id)}
          className="btn btn-outline"
          title="Odayı Sil"
          style={{ padding: '0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default RoomCard;
