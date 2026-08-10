/**
 * BiteMatch'in statik keşif kataloğuna eklenen editoryal kartlar.
 *
 * Bu dosyadaki yemek ve aktivite kartları, bir marka/tek şube değil, kullanıcı
 * konumuna göre gerçek işletme araması yapılacak niyetlerdir. Görseller sabit
 * Unsplash görselleridir; rastgele sorgu URL'si kullanılmaz, böylece kartın
 * görseli oturumlar arasında değişmez.
 *
 * Film/dizi kartlarında lisanssız poster kullanmıyoruz. `visualLabel`, kartta
 * gösterilen görselin resmi poster değil tematik editoryal görsel olduğunu
 * açıkça belirtmek için kullanılır. Canlı vizyon verisi geldiğinde bu kartlar
 * resmi sağlayıcı posteriyle ayrı bir akışta gösterilecektir.
 */
export const curatedCatalogAdditions = {
  mekan: [
    {
      name: 'Mantı & Ev Yemekleri',
      mapsQuery: 'mantı ev yemekleri',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'home-style', venueConcept: 'Ev yemekleri',
      description: 'El açması mantı, sulu yemek ve samimi esnaf lokantalarıyla klasik bir öğle ya da akşam seçeneği.',
    },
    {
      name: 'İskender & Bursa Kebabı',
      mapsQuery: 'iskender kebap bursa kebabı',
      imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'turkish-grill', venueConcept: 'Kebapçı',
      description: 'Tereyağı, domates sosu ve yoğurtla servis edilen sıcak, doyurucu Bursa klasiği.',
    },
    {
      name: 'Çiğ Köfte & Dürüm',
      mapsQuery: 'çiğ köfte dürüm',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=85',
      budget: '₺', discoveryGroup: 'turkish-street-food', venueConcept: 'Sokak lezzetleri',
      description: 'Bol yeşillik, nar ekşisi ve lavaşla hızlı, bütçe dostu bir sokak lezzeti.',
    },
    {
      name: 'Kumpir',
      mapsQuery: 'kumpir',
      imageUrl: 'https://images.unsplash.com/photo-1585238342028-4a7f8e10e854?w=1200&q=85',
      budget: '₺', discoveryGroup: 'street-comfort', venueConcept: 'Sokak lezzetleri',
      description: 'Fırın patatesini kendi malzemelerinle doldur; paylaşması kolay, keyifli bir buluşma seçeneği.',
    },
    {
      name: 'Kokoreç & Midye',
      mapsQuery: 'kokoreç midye dolma',
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=85',
      budget: '₺', discoveryGroup: 'turkish-street-food', venueConcept: 'Gece lezzetleri',
      description: 'Geceye uzayan planlar için baharatlı kokoreç veya limonlu midye dolma.',
    },
    {
      name: 'Balık Ekmek',
      mapsQuery: 'balık ekmek',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=85',
      budget: '₺', discoveryGroup: 'seafood-street', venueConcept: 'Sahil lezzetleri',
      description: 'Izgara balık, taze ekmek ve deniz havasıyla kısa ama karakterli bir mola.',
    },
    {
      name: 'Baklava & Katmer',
      mapsQuery: 'baklava katmer tatlıcı',
      imageUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'turkish-dessert', venueConcept: 'Tatlıcı',
      description: 'Antep fıstığı, ince yufka ve kaymakla tatlı bir buluşmayı özel hale getirin.',
    },
    {
      name: 'Simit & Çay',
      mapsQuery: 'simit çay kafe',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&q=85',
      budget: '₺', discoveryGroup: 'tea-break', venueConcept: 'Kafe',
      description: 'Kısa sohbetler ve düşük bütçeli planlar için Türkiye’nin en zamansız ikilisi.',
    },
    {
      name: 'Kore Mutfağı',
      mapsQuery: 'kore restoranı bibimbap korean bbq',
      imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1200&q=85',
      budget: '₺₺₺', discoveryGroup: 'korean', venueConcept: 'Dünya mutfağı',
      description: 'Bibimbap, kimchi ve Kore usulü ızgarayla yeni tatlar denemek isteyenlere.',
    },
    {
      name: 'Dondurma & Gelato',
      mapsQuery: 'dondurma gelato',
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=1200&q=85',
      budget: '₺', discoveryGroup: 'ice-cream', venueConcept: 'Dondurmacı',
      description: 'Yürüyüşe eşlik edecek, hafif ve mevsim fark etmeksizin keyifli bir tatlı molası.',
    },
  ],
  film: [
    {
      name: 'Parasite', imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=85',
      imdbScore: 8.5, duration: '132 dk', discoveryGroup: 'social-thriller', visualLabel: 'Temsili gerilim görseli',
      description: 'Sınıf farklarını keskin mizah ve gerilimle anlatan Oscar ödüllü Güney Kore yapımı.',
    },
    {
      name: 'La La Land', imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=85',
      imdbScore: 8.0, duration: '128 dk', discoveryGroup: 'musical-romance', visualLabel: 'Temsili caz görseli',
      description: 'Los Angeles’ta hayallerinin peşindeki iki insanın müzik ve romantizm dolu hikâyesi.',
    },
    {
      name: 'The Truman Show', imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=1200&q=85',
      imdbScore: 8.2, duration: '103 dk', discoveryGroup: 'satire-drama', visualLabel: 'Temsili ekran görseli',
      description: 'Hayatının dev bir televizyon programı olduğunu bilmeyen Truman’ın özgürlük arayışı.',
    },
    {
      name: 'Knives Out', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=85',
      imdbScore: 7.9, duration: '130 dk', discoveryGroup: 'mystery', visualLabel: 'Temsili gizem görseli',
      description: 'Zengin bir ailenin evindeki ölümün ardından herkesin şüpheli olduğu modern bir polisiye.',
    },
    {
      name: 'Mad Max: Fury Road', imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85',
      imdbScore: 8.1, duration: '120 dk', discoveryGroup: 'action', visualLabel: 'Temsili çöl görseli',
      description: 'Çölde geçen yüksek tempolu kovalamaca ve hayatta kalma hikâyesi.',
    },
    {
      name: 'The Matrix', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85',
      imdbScore: 8.7, duration: '136 dk', discoveryGroup: 'sci-fi', visualLabel: 'Temsili teknoloji görseli',
      description: 'Gerçekliğin sandığımız şey olmayabileceğini sorgulatan bilimkurgu klasiği.',
    },
    {
      name: 'The Grand Budapest Hotel', imageUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=85',
      imdbScore: 8.1, duration: '100 dk', discoveryGroup: 'comedy-adventure', visualLabel: 'Temsili otel görseli',
      description: 'Avrupa’nın zarif bir otelinde geçen, stil sahibi ve absürt bir macera.',
    },
    {
      name: 'The Last of Us', imageUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=85',
      imdbScore: 8.7, duration: '50 dk', discoveryGroup: 'post-apocalyptic', visualLabel: 'Temsili doğa görseli',
      description: 'Salgın sonrası dünyada hayatta kalmaya çalışan iki yol arkadaşının sert hikâyesi.',
    },
    {
      name: 'The Queen’s Gambit', imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&q=85',
      imdbScore: 8.5, duration: '60 dk', discoveryGroup: 'coming-of-age', visualLabel: 'Temsili satranç görseli',
      description: 'Genç bir satranç dehasının başarı, bağımlılık ve yalnızlıkla mücadelesi.',
    },
    {
      name: 'Pride & Prejudice', imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1200&q=85',
      imdbScore: 7.8, duration: '129 dk', discoveryGroup: 'romance', visualLabel: 'Temsili dönem görseli',
      description: 'Elizabeth Bennet ve Bay Darcy’nin önyargılarla başlayan zamansız aşk hikâyesi.',
    },
  ],
  aktivite: [
    {
      name: 'Escape Room', mapsQuery: 'escape room kaçış oyunu', imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'puzzle', venueConcept: 'Takım oyunu', description: 'Süre dolmadan ipuçlarını çözün; birlikte karar vermeyi gerektiren güçlü bir ekip aktivitesi.',
    },
    {
      name: 'Stand-up Gösterisi', mapsQuery: 'stand up komedi gösterisi', imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'comedy', venueConcept: 'Canlı komedi', description: 'Kısa, sosyal ve planlaması kolay bir akşam için canlı stand-up gösterisi.',
    },
    {
      name: 'Laser Tag', mapsQuery: 'laser tag lazer oyun alanı', imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'active-game', venueConcept: 'Takım oyunu', description: 'Işıklar altında strateji, rekabet ve bol hareket isteyen gruplar için.',
    },
    {
      name: 'Paintball', mapsQuery: 'paintball alanı', imageUrl: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1200&q=85',
      budget: '₺₺₺', discoveryGroup: 'adrenaline', venueConcept: 'Açık hava sporları', description: 'Takımlara ayrılıp açık havada tempolu ve rekabetçi bir gün geçirmek için.',
    },
    {
      name: 'VR Oyun Alanı', mapsQuery: 'sanal gerçeklik vr oyun alanı', imageUrl: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'digital-play', venueConcept: 'Oyun merkezi', description: 'Birlikte keşfedilecek sanal dünyalar ve kısa seanslarla farklı bir oyun deneyimi.',
    },
    {
      name: 'Dans Dersi', mapsQuery: 'salsa bachata dans dersi', imageUrl: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'dance', venueConcept: 'Dans stüdyosu', description: 'Salsa, bachata veya sosyal danslarla birlikte yeni bir şey denemek isteyenlere.',
    },
    {
      name: 'Yoga & Pilates', mapsQuery: 'yoga pilates stüdyosu', imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'wellness-active', venueConcept: 'Wellness', description: 'Yoğun tempoya ara verip birlikte iyi hissetmeye odaklanan sakin bir plan.',
    },
    {
      name: 'Akvaryum Gezisi', mapsQuery: 'akvaryum', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=85',
      budget: '₺₺₺', discoveryGroup: 'indoor-discovery', venueConcept: 'Keşif', description: 'Deniz yaşamını keşfetmek ve yağmurlu günlerde kapalı alanda gezmek için ideal.',
    },
    {
      name: 'Kitapçı & Kafe', mapsQuery: 'kitapçı kafe', imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=85',
      budget: '₺', discoveryGroup: 'quiet-social', venueConcept: 'Kültür & kafe', description: 'Kitap rafları arasında sakin sohbet, kahve ve küçük keşifler için.',
    },
    {
      name: 'Doğa Yürüyüşü', mapsQuery: 'doğa yürüyüş parkuru', imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=85',
      budget: 'Bedava', discoveryGroup: 'outdoor-hike', venueConcept: 'Açık hava', description: 'Şehirden kısa süreli uzaklaşmak, hareket etmek ve birlikte rota keşfetmek için.',
    },
  ],
};
