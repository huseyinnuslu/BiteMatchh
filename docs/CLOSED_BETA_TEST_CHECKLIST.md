# BiteMatch kapalı beta test listesi

Her satır iki farklı hesapla tamamlanmalı. Sorun bulunduğunda ekran görüntüsü, kullanılan cihaz ve tekrar adımları not edilmelidir.

## 1. Hesap ve profil

- [ ] E-posta ile kayıt ol; hoş geldin e-postasını gelen kutusu ve spam klasöründe kontrol et.
- [ ] Google ile giriş yap; kullanıcı adı seçme/değiştirme akışını doğrula.
- [ ] Profil fotoğrafını değiştir; sayfayı yenilemeden kendi profilinde, navbar’da ve arkadaş listesinde güncellendiğini kontrol et.
- [ ] Render deployundan sonra aynı avatarın kaybolmadığını doğrula.
- [ ] Ayarlar’dan veri indir; JSON dosyasının açıldığını kontrol et.
- [ ] Test hesabında hesap silme kodu iste; kod gelmeden silme yapılamadığını doğrula. Gerçek hesabı silme.

## 2. Sosyal ve bildirim akışı

- [ ] A hesabından B’ye arkadaşlık isteği gönder; B yenilemeden bildirimi görsün.
- [ ] B isteği kabul etsin; iki profilde de avatar, rütbe ve arkadaş bilgisi güncel olsun.
- [ ] Arkadaş profilinden “Mesaj gönder”e bas; doğru sohbet açılsın.
- [ ] Bir mesaj gönder, mesajı sil ve iki hesapta da kaldırıldığını kontrol et.
- [ ] “Sohbeti temizle” yalnızca temizleyen hesapta etkili olsun; diğer hesapta sohbet kalsın.

## 3. Oda ve eşleşme

- [ ] A oda oluştursun, B davet bağlantısıyla katılsın; tek davet ve tek katılım bildirimi görünsün.
- [ ] İki kullanıcı farklı kartlarda oy kullansın; eski eşleşme sonucu yeni odaya taşınmasın.
- [ ] Ortak kart çıktığında iki kullanıcı da aynı eşleşme sonucunu görsün.
- [ ] Odadan çık butonu onay istesin; odadan ayrılma bildirimi bir kez gelsin.
- [ ] Film odasında iki katılımcı platformlarını seçsin; ortak erişimi olmayan içerik çıkmasın.

## 4. Restoran ve konum

- [ ] İki cihazda konum izni ver; iki kullanıcı da üç öneriyi ve kendi mesafesini görsün.
- [ ] Önerilenler oylamasında ortak tercih oluştuğunda restoran sonucu iki tarafta da açılsın.
- [ ] “Kendim seçeceğim” seçeneğinin harita aramasına doğru yemek türüyle yönlendirdiğini doğrula.
- [ ] Konum reddedildiğinde akışın açıklayıcı hata verip uygulamayı kilitlemediğini doğrula.
- [ ] İstanbul dışındaki bir konumla en az bir restoran akışını dene.

## 5. Mobil, PWA ve e-posta

- [ ] iPhone Safari’de Mesajlar’a gir; konuşma başlığı görünür olsun ve sayfa footer’a kaymasın.
- [ ] Android Chrome’da veya emülatörde oda, kart ve sonuç ekranlarını kontrol et.
- [ ] Deploy sonrası uygulamayı kapat/aç; yeni sürümün geldiğini doğrula.
- [ ] Şifre sıfırlama, e-posta değiştirme ve silme kodunun gerçek posta kutusuna ulaştığını kontrol et.

## Test sonucu kaydı

Her hata için şu dört bilgi yeterlidir: tarih/saat, A-B hesapları, cihaz-tarayıcı, tekrar adımları + ekran görüntüsü.
