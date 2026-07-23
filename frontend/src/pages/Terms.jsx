import { Shield, FileText } from 'lucide-react';

const Terms = () => {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
          <Shield size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>BiteMatch Kullanıcı Sözleşmesi</h1>
        <p style={{ color: 'var(--text-muted)' }}>ve KVKK Aydınlatma Metni</p>
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

        <section>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} /> 4. KVKK ve Veri Gizliliği
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında verileriniz şu amaçlarla işlenmektedir:
          </p>
          <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong style={{ color: 'white' }}>Toplanan Veriler:</strong> E-posta adresiniz, şifreniz (kriptolanarak/şifrelenerek güvenli tutulur), IP adresiniz ve uygulama içi oda/mesaj etkinlikleriniz.</li>
            <li><strong style={{ color: 'white' }}>İşlenme Amacı:</strong> Sistemde oturum açmanız, eşleşme odalarının düzgün çalışması, teknik hataların giderilmesi ve güvenliğinizin sağlanması.</li>
            <li><strong style={{ color: 'white' }}>Veri Paylaşımı:</strong> Verileriniz hiçbir şekilde üçüncü şahıslara veya kurumlara satılmaz, reklam amacıyla paylaşılmaz. Sadece resmi makamların hukuki talepleri doğrultusunda yasal zorunluluklarla paylaşılabilir.</li>
          </ul>
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
          <p style={{ color: 'var(--success)', margin: 0, fontWeight: 500 }}>
            Platforma kayıt olarak tüm bu şartları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Terms;
