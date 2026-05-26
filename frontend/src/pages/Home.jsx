import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex-center" style={{ flexDirection: 'column', textAlign: 'center', height: '70vh' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
        Ne Yiyeceğiz Tartışmasına <span className="text-gradient">Son Ver!</span>
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '2rem' }}>
        Arkadaş grubunla karar veremiyor musun? Bir oda kur, seçenekleri ekle, herkes sağa veya sola kaydırsın. Herkesin ilk sağa kaydırdığı (beğendiği) seçenek EŞLEŞSİN!
      </p>
      <Link to="/register" className="btn btn-primary pulse-primary" style={{ fontSize: '1.2rem', padding: '1rem 2.5rem' }}>
        Hemen Başla
      </Link>
    </div>
  );
};

export default Home;
