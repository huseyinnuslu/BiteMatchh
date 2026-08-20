# BiteMatch Mobile

Expo / React Native tabanlı BiteMatch mobil uygulaması.

## Yerelde iPhone ile test

1. iPhone'a App Store'dan **Expo Go** yükle.
2. Bu klasörde `npm run start -- --tunnel` çalıştır.
3. Terminaldeki QR kodu Expo Go ile tara.

Uygulama varsayılan olarak production API'sine bağlanır:
`https://bitematchh.onrender.com`.

Farklı bir backend kullanmak için `.env` oluşturup şunu yaz:

```env
EXPO_PUBLIC_API_URL=https://senin-api-adresin.com
```

`.env` dosyası depoya eklenmez.

## Bu ilk mobil temel paketi

- E-posta/kullanıcı adı ile gerçek API girişi
- `expo-secure-store` ile cihazda güvenli oturum saklama
- Socket.IO bağlantısı
- Karanlık BiteMatch mobil tasarım iskeleti

Sonraki paket: kayıt + Google giriş, Keşfet/oda oluşturma ve oda akışı.
