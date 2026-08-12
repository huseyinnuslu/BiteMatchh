/**
 * BiteMatch'in statik keşif kataloğuna eklenen editoryal kartlar.
 *
 * Bu dosyadaki yemek ve aktivite kartları, bir marka/tek şube değil, kullanıcı
 * konumuna göre gerçek işletme araması yapılacak niyetlerdir. Görseller sabit
 * kaynak URL'leridir; rastgele sorgu URL'si kullanılmaz, böylece kartın
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
      // Bursa usulü İskender: döner, pide, domates sosu ve yoğurt görünür.
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Iskender_Kebap_Bursa_Iskender.JPG',
      budget: '₺₺', discoveryGroup: 'turkish-grill', venueConcept: 'Kebapçı',
      description: 'Tereyağı, domates sosu ve yoğurtla servis edilen sıcak, doyurucu Bursa klasiği.',
    },
    {
      name: 'Çiğ Köfte & Dürüm',
      mapsQuery: 'çiğ köfte dürüm',
      // Çiğ köfte dürüm: lavaş, yeşillik ve çiğ köfte dolgusu.
      imageUrl: 'https://images.deliveryhero.io/image/fd-tr/LH/o1sm-listing.jpg',
      budget: '₺', discoveryGroup: 'turkish-street-food', venueConcept: 'Sokak lezzetleri',
      description: 'Bol yeşillik, nar ekşisi ve lavaşla hızlı, bütçe dostu bir sokak lezzeti.',
    },
    {
      name: 'Kumpir',
      mapsQuery: 'kumpir',
      imageUrl: 'https://kibris.nethouse.ru/static/img/0000/0003/3028/33028348.lz6gvagoqi.W665.jpg',
      budget: '₺', discoveryGroup: 'street-comfort', venueConcept: 'Sokak lezzetleri',
      description: 'Fırın patatesini kendi malzemelerinle doldur; paylaşması kolay, keyifli bir buluşma seçeneği.',
    },
    {
      name: 'Kokoreç & Midye',
      mapsQuery: 'kokoreç midye dolma',
      // Aynı karede hem kokoreç hem limonlu midye dolma bulunur.
      imageUrl: 'https://images.deliveryhero.io/image/fd-tr/LH/ir2x-listing.jpg',
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
      // Antep katmeri: çıtır katlar ve bol Antep fıstığı görünür.
      imageUrl: 'https://milligazetecomtr.teimg.com/crop/1280x720/milligazete-com-tr/sites/2024/07/05/gaziantep-mutfaginin-essiz-lezzeti-ile-damak-catlatin-evde-katmer-yapimi.jpg',
      budget: '₺₺', discoveryGroup: 'turkish-dessert', venueConcept: 'Tatlıcı',
      description: 'Antep fıstığı, ince yufka ve kaymakla tatlı bir buluşmayı özel hale getirin.',
    },
    {
      name: 'Simit & Çay',
      mapsQuery: 'simit çay kafe',
      // Susamlı simitler ve ince belli çay bardakları birlikte.
      imageUrl: 'https://visitizmiryonetim.izmir.bel.tr/CKYuklenen/207032021_020423009_2_27022021_124508852_1_PZqpYq142h.jpg',
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
    {
      name: 'Gözleme & Ayran',
      mapsQuery: 'gözleme',
      // Sac gözlemesi ve köpüklü ayran aynı kadrajda.
      imageUrl: 'https://www.gutekueche.at/storage/media/recipe/157531/conv/goezleme-default.jpg',
      budget: '₺', discoveryGroup: 'anatolian-flatbread', venueConcept: 'Anadolu mutfağı',
      description: 'Peynirli, ıspanaklı veya kıymalı gözlemeyi soğuk ayranla tamamlayan sade ve paylaşması kolay bir mola.',
    },
    {
      name: 'Menemen & Kahvaltı',
      mapsQuery: 'menemen kahvaltı',
      imageUrl: 'https://images.deliveryhero.io/image/fd-tr/LH/hvi8-listing.jpg',
      budget: '₺₺', discoveryGroup: 'turkish-breakfast', venueConcept: 'Kahvaltıcı',
      description: 'Domates, biber ve yumurtayla hazırlanan sıcak menemen; uzun hafta sonu sohbetleri için güçlü bir başlangıç.',
    },
    {
      name: 'Meze & Balık',
      mapsQuery: 'meze balık restoranı',
      imageUrl: 'https://i.kocatepegazetesi.com/c/80/740x417/s/dosya/haber/kultur-ve-turizm-bakanligi-nin_1726733766_xQcDwH.jpeg',
      budget: '₺₺₺', discoveryGroup: 'meze-seafood', venueConcept: 'Meyhane & balıkçı',
      description: 'Paylaşmalık soğuk mezeler, sıcak ara sıcaklar ve uzun bir akşam yemeği isteyen gruplar için.',
    },
    {
      name: 'Çorba & Esnaf Lokantası',
      mapsQuery: 'çorbacı esnaf lokantası',
      // Mercimek çorbası: limonlu, kırmızı yağlı klasik servis.
      imageUrl: 'https://cdn.tasteatlas.com/Images/Dishes/51beed5e91d749d9a8c47fd05e3d7ea8.jpg?mw=1300',
      budget: '₺', discoveryGroup: 'soup-home-style', venueConcept: 'Esnaf lokantası',
      description: 'Mercimek, kelle paça veya günün ev yemeğiyle hızlı, sıcak ve bütçe dostu bir öğün.',
    },
    {
      name: 'Tavuk Döner & Pilav',
      mapsQuery: 'tavuk döner pilav',
      // Pilav üstü tavuk dönerin gerçek tabak servisi.
      imageUrl: 'https://images.deliveryhero.io/image/global-menu-service/YS_TR/vendor/lwbu/product/a2bbb336-53e6-4201-bca8-83ef6bef9947.jpg?height=900&width=900',
      budget: '₺', discoveryGroup: 'chicken-street-food', venueConcept: 'Hızlı servis',
      description: 'Tavuk döner, pilav ve ayranla kısa sürede doyurucu bir öğle veya akşam seçeneği.',
    },
    {
      name: 'Pankek & Kahvaltı',
      mapsQuery: 'pankek kahvaltı kafe',
      imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'sweet-breakfast', venueConcept: 'Brunch kafe',
      description: 'Meyve, bal ve yumuşak pankeklerle tatlı başlayan, kahve eşlikli keyifli bir brunch planı.',
    },
    {
      name: 'Cheesecake & Kahve',
      mapsQuery: 'cheesecake kahve kafe',
      // Kahveyle birlikte servis edilmiş gerçek cheesecake.
      imageUrl: 'https://tblg.k-img.com/restaurant/images/Rvw/335059/640x640_rect_4c5ffc8d9e44693fcb36537ceeee01ad.jpg',
      budget: '₺₺', discoveryGroup: 'coffee-dessert', venueConcept: 'Tatlı kafe',
      description: 'Kahve yanında paylaşılacak bir dilim cheesecake; kısa buluşmalar için tatlı ve pratik bir tercih.',
    },
    {
      name: 'Mangal & Izgara',
      mapsQuery: 'mangal ızgara restoranı',
      // Kömür ateşinde et, tavuk şiş, sebze ve soslarla hazırlanmış mangal sofrası.
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=85',
      budget: '₺₺₺', discoveryGroup: 'open-fire-grill', venueConcept: 'Izgara restoranı',
      description: 'Köz ateşinde et, tavuk ve sebzelerle kalabalık arkadaş gruplarına uygun, uzun sofralık bir plan.',
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
    {
      name: 'Arcane', imageUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e745b?w=1200&q=85',
      imdbScore: 9.0, duration: '41 dk', platform: 'Netflix', discoveryGroup: 'animated-fantasy', visualLabel: 'Temsili fantastik şehir görseli',
      description: 'Piltover ve Zaun’un iki zıt dünyasında geçen, güçlü görsel diliyle öne çıkan animasyon dizisi.',
    },
    {
      name: 'Dark', imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=85',
      imdbScore: 8.7, duration: '60 dk', platform: 'Netflix', discoveryGroup: 'time-mystery', visualLabel: 'Temsili karanlık orman görseli',
      description: 'Kayıp bir çocukla başlayan hikâyenin zaman döngüleri ve aile sırlarıyla iç içe geçtiği Alman gizemi.',
    },
    {
      name: 'BoJack Horseman', imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=85',
      imdbScore: 8.8, duration: '25 dk', platform: 'Netflix', discoveryGroup: 'animated-drama', visualLabel: 'Temsili Hollywood görseli',
      description: 'Şöhret, bağımlılık ve dostluk üzerine beklenmedik derecede derin yetişkin animasyonu.',
    },
    {
      name: 'The Crown', imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=85',
      imdbScore: 8.6, duration: '58 dk', platform: 'Netflix', discoveryGroup: 'historical-drama', visualLabel: 'Temsili saray görseli',
      description: 'II. Elizabeth dönemini merkezine alan, kraliyet ile kişisel hayat arasındaki gerilimi anlatan dönem draması.',
    },
    {
      name: 'Wednesday', imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=85',
      imdbScore: 8.0, duration: '45 dk', platform: 'Netflix', discoveryGroup: 'gothic-mystery', visualLabel: 'Temsili gotik okul görseli',
      description: 'Wednesday Addams’ın yatılı okulda hem yeni çevresini hem de doğaüstü bir gizemi çözmesini anlatan kara komedi.',
    },
    {
      name: 'Chernobyl', imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=85',
      imdbScore: 9.3, duration: '60 dk', platform: 'HBO Max', discoveryGroup: 'historical-disaster', visualLabel: 'Temsili endüstriyel görsel',
      description: '1986 nükleer felaketinin ardındaki insan hatalarını ve bedelini sarsıcı biçimde anlatan mini dizi.',
    },
    {
      name: 'Fleabag', imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=85',
      imdbScore: 8.7, duration: '26 dk', platform: 'Prime Video', discoveryGroup: 'dark-comedy', visualLabel: 'Temsili sahne görseli',
      description: 'Yas, ilişki ve aile karmaşasını doğrudan kameraya konuşan keskin mizahlı bir kadın karakterin gözünden anlatır.',
    },
    {
      name: 'Silo', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85',
      imdbScore: 8.1, duration: '49 dk', platform: 'Apple TV+', discoveryGroup: 'dystopian-mystery', visualLabel: 'Temsili distopik teknoloji görseli',
      description: 'İnsanlığın yer altındaki dev bir siloda yaşadığı dünyada, saklanan gerçekleri araştıran bilimkurgu gizemi.',
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
    {
      name: 'Mini Golf', mapsQuery: 'mini golf', imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'casual-sport', venueConcept: 'Sosyal oyun', description: 'Kısa turlar, kolay rekabet ve bol fotoğraf molasıyla sakin ama eğlenceli bir buluşma.',
    },
    {
      name: 'Bilardo & Dart', mapsQuery: 'bilardo dart kafe', imageUrl: 'https://images.unsplash.com/photo-1770120971750-1acb39382c4b?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'bar-game', venueConcept: 'Sosyal oyun', description: 'Sohbeti bölmeden küçük turnuvalar yapabileceğiniz, akşam planına uygun rahat bir aktivite.',
    },
    {
      name: 'Kahve Tadımı', mapsQuery: 'kahve tadımı üçüncü nesil kahve', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'coffee-experience', venueConcept: 'Kahve deneyimi', description: 'Farklı çekirdekleri, demleme yöntemlerini ve tat notalarını birlikte deneyebileceğiniz sakin bir keşif.',
    },
    {
      name: 'Plakçı & Müzik Keşfi', mapsQuery: 'plakçı müzik mağazası', imageUrl: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=1200&q=85',
      budget: 'Bedava', discoveryGroup: 'music-culture', venueConcept: 'Müzik kültürü', description: 'Plak rafları arasında yeni albümler keşfedip ardından yakınlarda kahve molası verebileceğiniz bir rota.',
    },
    {
      name: 'Sörf & SUP', mapsQuery: 'sup sörf dersi', imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200&q=85',
      budget: '₺₺₺', discoveryGroup: 'water-sport', venueConcept: 'Su sporu', description: 'Deniz veya gölde denge, hareket ve açık hava isteyenler için başlangıç seviyesine uygun su sporu planı.',
    },
    {
      name: 'Yaratıcı Yazarlık Atölyesi', mapsQuery: 'yaratıcı yazarlık atölyesi', imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'writing-workshop', venueConcept: 'Kültür atölyesi', description: 'Kısa yazma egzersizleri ve yeni insanlarla tanışma fırsatı sunan, sakin bir üretim etkinliği.',
    },
    {
      name: 'Masa Tenisi', mapsQuery: 'masa tenisi salonu', imageUrl: 'https://images.unsplash.com/photo-1516703713542-594d741f66c1?w=1200&q=85',
      budget: '₺', discoveryGroup: 'racket-sport', venueConcept: 'Spor & eğlence', description: 'Hızlı öğrenilen, kısa setlerle oynanan ve iki kişilik buluşmalara çok uygun bir spor seçeneği.',
    },
    {
      name: 'Kamp & Gün Batımı', mapsQuery: 'kamp alanı gün batımı', imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=85',
      budget: '₺₺', discoveryGroup: 'camping', venueConcept: 'Doğa kaçamağı', description: 'Şehirden uzaklaşıp kamp ateşi, manzara ve uzun sohbetlerle günü kapatmak isteyenlere.',
    },
  ],
};
