import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      
      {/* Geri Dön Butonu */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ 
          position: 'absolute', top: '2rem', left: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
          color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px', 
          cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <ArrowLeft size={16} /> Geri Dön
      </button>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
          <Shield size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>BiteMatch Kullanıcı Sözleşmesi</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '.25rem' }}>ve KVKK Aydınlatma Metni</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', margin: 0 }}>Metin sürümü: 2026-08-14</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
        
        <section>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 1. Taraflar ve Kapsam
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Bu sözleşme, BiteMatch platformunu (bundan sonra "Platform" olarak anılacaktır) kullanan tüm kullanıcılar için geçerlidir. Platforma kayıt olan veya misafir olarak katılan herkes bu şartları kabul etmiş sayılır.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 2. Yer Sağlayıcı Sorumluluğu (5651 Sayılı Kanun)
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            BiteMatch, 5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi Hakkında Kanun kapsamında bir "Yer Sağlayıcı"dır. Platform üzerinde kurulan odaların isimleri, mesajlaşma alanlarında paylaşılan içerikler, bağlantılar ve beyanlar tamamen kullanıcıların kendi sorumluluğundadır. BiteMatch, kullanıcılar tarafından üretilen içerikleri önceden kontrol etme veya hukuka aykırı bir faaliyeti araştırma yükümlülüğüne sahip değildir. Hukuka aykırı bir durum tespiti halinde içerik kaldırılabilir.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 3. Kullanım Kuralları
          </h2>
          <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Kullanıcılar; platform üzerinde yasadışı, tehdit, hakaret, küfür içeren veya üçüncü şahısların haklarını ihlal eden mesajlar gönderemez ve oda isimleri oluşturamaz.</li>
            <li>BiteMatch, kuralları ihlal eden veya sistemin işleyişini bozmaya çalışan kullanıcıların hesaplarını önceden haber vermeksizin silme, askıya alma ve IP adreslerini engelleme hakkını saklı tutar.</li>
          </ul>
        </section>

        <section id="kvkk">
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 4. KVKK ve Veri Gizliliği
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bu metin, 6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında BiteMatch'i kullanırken hangi verilerin neden işlendiğini açıklamak içindir. Bu bilgilendirme, pazarlama amaçlı bir açık rıza değildir.
          </p>
          <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong style={{ color: 'white' }}>İşlenen veriler:</strong> Kullanıcı adı, e-posta adresi, şifre özeti, profil fotoğrafı, arkadaşlık ve bildirim kayıtları, oda/eşleşme geçmişi, mesaj içerikleri, destek talepleri ve konum paylaşımını seçtiğinizde konum verisi.</li>
            <li><strong style={{ color: 'white' }}>İşlenme amacı:</strong> Hesabınızı oluşturmak ve korumak, oda/eşleşme ve mesajlaşma özelliklerini sunmak, size ait geçmişi göstermek, destek taleplerini yanıtlamak, güvenliği sağlamak ve teknik sorunları gidermek.</li>
            <li><strong style={{ color: 'white' }}>Hukuki sebepler:</strong> Başta sözleşmenin kurulması veya ifası ile BiteMatch'in güvenli ve işlevsel biçimde sunulmasına ilişkin meşru menfaat olmak üzere, ilgili KVKK koşullarına dayanılır. Zorunlu olmayan pazarlama izinleri ayrıca ve ayrı bir seçimle istenir.</li>
            <li><strong style={{ color: 'white' }}>Hizmet sağlayıcılar:</strong> Uygulamanın çalışması için veriler; veritabanı altyapısında MongoDB Atlas, yayın/uygulama altyapısında Vercel ve Render, Google ile girişte Google, e-posta gönderiminde seçilen e-posta sağlayıcısı ile sınırlı olarak işlenebilir. Konum paylaşımını seçerseniz mekan önerisi üretmek amacıyla Foursquare Places'e arama sorgusu iletilebilir.</li>
            <li><strong style={{ color: 'white' }}>Saklama ve silme:</strong> Hesabınız aktifken veriler, bu özellikleri sunmak için gerekli olduğu süre boyunca saklanır. Ayarlar üzerinden hesap silme işlemi başlatarak hesabınızla bağlantılı verilerin silinmesini talep edebilir; verilerinizi dışa aktarabilirsiniz.</li>
          </ul>
          <div style={{ marginTop: '1.2rem', padding: '1rem', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.08)', borderRadius: '10px', color: 'var(--text-muted)' }}>
            <strong style={{ color: '#fbbf24' }}>KVKK başvurusu ve haklarınız:</strong> KVKK'nın 11. maddesi kapsamındaki bilgi alma, düzeltme, silme/yok etme, itiraz ve diğer talepleriniz için uygulamadaki <strong style={{ color: 'white' }}>Ayarlar &gt; Destek</strong> alanını kullanabilirsiniz. Veri sorumlusunun kimliği ve resmi başvuru iletişim bilgileri, yayına geçmeden önce bu metne ayrıca eklenecektir.
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 5. Çerez (Cookie) Politikası
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            BiteMatch, oturumunuzu açık tutmak (token yönetimi) ve uygulamanın performansını anonim olarak analiz etmek amacıyla tarayıcınızda çerezler (cookies) ve yerel depolama (local storage) araçları kullanır.
          </p>
        </section>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: 'var(--success)', margin: '0 0 1rem', fontWeight: 500 }}>
            Platforma kayıt olurken Kullanıcı Sözleşmesi kabulünüz ve KVKK Aydınlatma Metni'ni okuduğunuza ilişkin bilgilendirme onayınız ayrı ayrı kaydedilir.
          </p>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-primary"
            style={{ padding: '0.6rem 2rem' }}
          >
            Okudum, Anladım, Onaylıyorum
          </button>
        </div>

      </div>
    </div>
  );
};

export default Terms;
