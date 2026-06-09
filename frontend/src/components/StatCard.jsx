/**
 * StatCard Bileşeni
 * Admin panelinde ve istatistik ekranlarında kullanılan bilgi kartı.
 * Props:
 *   - icon: Emoji veya React node
 *   - label: Kart açıklaması
 *   - value: Gösterilecek sayısal değer
 *   - color: Değer rengi (HEX veya CSS değişkeni)
 */
const StatCard = ({ icon, label, value, color }) => {
  return (
    <div
      className="glass-card"
      style={{ textAlign: 'center', padding: '1.5rem', transition: 'transform 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{icon}</div>
      <div style={{
        fontSize: '2rem', fontWeight: 800,
        color: color || 'var(--primary)',
        lineHeight: 1,
      }}>
        {value ?? '—'}
      </div>
      <div style={{
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
        marginTop: '0.35rem',
      }}>
        {label}
      </div>
    </div>
  );
};

export default StatCard;
