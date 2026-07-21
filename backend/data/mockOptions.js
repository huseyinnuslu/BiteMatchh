/**
 * mockOptions.js
 * BiteMatch – Kart havuzu
 *
 * Mekan: Gerçek İstanbul restoranları (Google Maps'te bulunur)
 * Film:  Gerçek film/dizi adları
 * Aktivite: Genel aktiviteler — mapsQuery ile doğru arama terimi
 *
 * mapsQuery: Maps'te bu metin aranır. Tanımlı değilse name + " İstanbul" kullanılır.
 */

export const mockOptions = {

  // ─────────────────────────────────────────────────────────────────────────
  // MEKAN — Gerçek İstanbul restoranları
  // ─────────────────────────────────────────────────────────────────────────
  mekan: [
    {
      name: 'Nusr-Et Steakhouse',
      mapsQuery: 'Nusr-Et Steakhouse Etiler İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1594046243098-0fceea9d451e?w=600&q=80',
      rating: 4.6,
      budget: '₺₺₺₺',
      location: 'Etiler',
      description: 'Ünlü şef Salt Bae\'nin dünyaca tanınan et restoranı. Özel kesimleri ve muhteşem sunumuyla eşsiz bir deneyim.'
    },
    {
      name: 'Çiya Sofrası',
      mapsQuery: 'Çiya Sofrası Kadıköy İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
      rating: 4.7,
      budget: '₺₺',
      location: 'Kadıköy',
      description: 'Anadolu\'nun unutulmuş lezzetlerini sofrasına taşıyan, Dünya\'nın en iyi 100 restoranına giren efsanevi mekan.'
    },
    {
      name: 'Hamdi Restaurant',
      mapsQuery: 'Hamdi Restaurant Eminönü İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
      rating: 4.6,
      budget: '₺₺₺',
      location: 'Eminönü',
      description: 'Altın Boynuz manzarası eşliğinde 50 yıllık tarihi olan meşhur Güneydoğu kebapları ve lahmacun.'
    },
    {
      name: 'Karaköy Lokantası',
      mapsQuery: 'Karaköy Lokantası İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&q=80',
      rating: 4.5,
      budget: '₺₺₺',
      location: 'Karaköy',
      description: 'Art Deco tasarımı ve geleneksel Türk mutfağını modernleştiren İstanbul\'un en prestijli lokantalarından.'
    },
    {
      name: 'Balıkçı Sabahattin',
      mapsQuery: 'Balıkçı Sabahattin Sultanahmet İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&q=80',
      rating: 4.7,
      budget: '₺₺₺',
      location: 'Sultanahmet',
      description: '1927\'den bu yana hizmet veren, Boğaz manzaralı balıkçı köyü atmosferinde taze deniz ürünleri.'
    },
    {
      name: 'Mikla Restaurant',
      mapsQuery: 'Mikla Restaurant Beyoğlu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      rating: 4.8,
      budget: '₺₺₺₺',
      location: 'Beyoğlu',
      description: 'Marmara Oteli\'nin tepesinde İstanbul panoramasıyla Türk-İskandinav füzyon mutfağı. Dünya\'nın en iyi restoranları listesinde.'
    },
    {
      name: 'Develi Kebap',
      mapsQuery: 'Develi Kebap Samatya İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
      rating: 4.6,
      budget: '₺₺',
      location: 'Samatya',
      description: '1912\'den bu yana Gaziantep mutfağının başkenti. İç yağlı Beyti kebabı ve fıstıklı baklavayla ünlü.'
    },
    {
      name: 'Hünkar Restaurant',
      mapsQuery: 'Hünkar Restaurant Nişantaşı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
      rating: 4.5,
      budget: '₺₺₺',
      location: 'Nişantaşı',
      description: '1950\'lerden bu yana hizmet veren, Osmanlı saray mutfağı geleneğini yaşatan efsanevi İstanbul lokantası.'
    },
    {
      name: 'Pandeli Restaurant',
      mapsQuery: 'Pandeli Restaurant Mısır Çarşısı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      rating: 4.5,
      budget: '₺₺₺',
      location: 'Mısır Çarşısı',
      description: '1901\'de kurulan tarihi Mısır Çarşısı\'nın üzerindeki efsanevi restoran. Osmanlı lezzetleri ve benzersiz atmosfer.'
    },
    {
      name: 'Asmalı Cavit',
      mapsQuery: 'Asmalı Cavit Beyoğlu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',
      rating: 4.4,
      budget: '₺₺',
      location: 'Asmalımescit',
      description: 'Beyoğlu\'nun kalbinde, meyhane kültürünü en iyi yaşatan mekânlardan biri. Mevsim mezeleri ve Türk şarapları.'
    },
    {
      name: 'Şükran Tantuni',
      mapsQuery: 'Şükran Tantuni Merter İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?w=600&q=80',
      rating: 4.5,
      budget: '₺',
      location: 'Merter',
      description: 'İstanbul\'un en meşhur tantunisi. Mis gibi kokusu ve lavaş arası incecik doğranmış etiyle İstanbul klasiği.'
    },
    {
      name: 'Tarihi Sultanahmet Köftecisi',
      mapsQuery: 'Tarihi Sultanahmet Köftecisi İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80',
      rating: 4.4,
      budget: '₺',
      location: 'Sultanahmet',
      description: '1920\'den bu yana kendi suyunda eriyen o eşsiz ızgara köftesiyle İstanbul\'un simgesi olmuş tarihi lokanta.'
    },
    {
      name: 'Giritli Restaurant',
      mapsQuery: 'Giritli Restaurant Cankurtaran İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&q=80',
      rating: 4.6,
      budget: '₺₺₺',
      location: 'Cankurtaran',
      description: 'Girit mutfağından ilham alan deniz ürünleri ve zeytinyağlı mezeler. Tarihi Osmanlı bahçesinde romantik akşam yemeği.'
    },
    {
      name: 'İnci Pastanesi',
      mapsQuery: 'İnci Pastanesi Beyoğlu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80',
      rating: 4.4,
      budget: '₺',
      location: 'Beyoğlu',
      description: '1944\'ten bu yana İstiklal Caddesi\'nin simgesi olan tarihi pastane. Profiterol ve dondurması İstanbul\'un hafızasında.'
    },
    {
      name: 'Konyalı Restaurant',
      mapsQuery: 'Konyalı Restaurant Topkapı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      rating: 4.3,
      budget: '₺₺₺',
      location: 'Topkapı',
      description: 'Topkapı Sarayı\'nın içinde konumlanan tarihi lokanta. Geleneksel Türk mutfağı ve saray manzarasıyla eşsiz bir deneyim.'
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // FİLM — Gerçek film/dizi adları (harita yönlendirmesi yok)
  // ─────────────────────────────────────────────────────────────────────────
  film: [
    {
      name: 'Interstellar',
      imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80',
      imdbScore: 8.7,
      duration: '169 dk',
      platform: 'Netflix',
      description: 'İnsanlık için yeni bir ev arayışında solucan deliğinden geçen astronotlar.'
    },
    {
      name: 'The Office (US)',
      imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=80',
      imdbScore: 9.0,
      duration: '22 dk',
      platform: 'Prime Video',
      description: 'Bir kağıt şirketindeki absürt ofis yaşantısı ve komik karakterler.'
    },
    {
      name: 'Dune: Part Two',
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
      imdbScore: 8.8,
      duration: '166 dk',
      platform: 'HBO Max',
      description: 'Paul Atreides\'in kaderini kabullenişi ve çöl gezegenindeki devasa savaş.'
    },
    {
      name: 'Inception',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
      imdbScore: 8.8,
      duration: '148 dk',
      platform: 'Netflix',
      description: 'İnsanların rüyalarına girerek en derin sırlarını çalan profesyonel bir hırsızın hikayesi.'
    },
    {
      name: 'Breaking Bad',
      imageUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=600&q=80',
      imdbScore: 9.5,
      duration: '49 dk',
      platform: 'Netflix',
      description: 'Kanser olduğunu öğrenen bir kimya öğretmeninin, ailesi için uyuşturucu üretimine girmesi.'
    },
    {
      name: 'The Dark Knight',
      imageUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&q=80',
      imdbScore: 9.0,
      duration: '152 dk',
      platform: 'Prime Video',
      description: 'Batman, Gotham şehrini kaosa sürükleyen Joker adındaki dahi suçluyla karşı karşıya gelir.'
    },
    {
      name: 'Stranger Things',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80',
      imdbScore: 8.7,
      duration: '50 dk',
      platform: 'Netflix',
      description: 'Ufak bir kasabada kaybolan bir çocuk ve onun peşinden ortaya çıkan doğaüstü olaylar.'
    },
    {
      name: 'Spider-Man: Into the Spider-Verse',
      imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&q=80',
      imdbScore: 8.4,
      duration: '117 dk',
      platform: 'Disney+',
      description: 'Miles Morales\'in radyoaktif bir örümcek tarafından ısırılmasıyla çoklu evren macerası.'
    },
    {
      name: 'Fight Club',
      imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80',
      imdbScore: 8.8,
      duration: '139 dk',
      platform: 'Prime Video',
      description: 'Monoton bir hayata sahip olan anlatıcının, karizmatik Tyler Durden ile kurduğu yeraltı dövüş kulübü.'
    },
    {
      name: 'Severance',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80',
      imdbScore: 8.7,
      duration: '50 dk',
      platform: 'Apple TV+',
      description: 'İş ve kişisel anılarını cerrahi yöntemle ayıran bir şirketteki gizemli olaylar.'
    },
    {
      name: 'Game of Thrones',
      imageUrl: 'https://images.unsplash.com/photo-1599727488059-4fccbf36706e?w=600&q=80',
      imdbScore: 9.2,
      duration: '57 dk',
      platform: 'HBO Max',
      description: 'Westeros\'un yedi krallığındaki taht kavgaları ve kuzeyden gelen antik tehdit.'
    },
    {
      name: 'Oppenheimer',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      imdbScore: 8.3,
      duration: '180 dk',
      platform: 'Prime Video',
      description: 'Atom bombasını geliştiren J. Robert Oppenheimer\'in trajik hikayesi ve tarihin seyrini değiştiren keşif.'
    },
    {
      name: 'Whiplash',
      imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80',
      imdbScore: 8.5,
      duration: '106 dk',
      platform: 'Netflix',
      description: 'Acımasız bir caz hocasının gözetimi altında sınırlarını zorlayan genç bir baterist.'
    },
    {
      name: 'Black Mirror',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
      imdbScore: 8.7,
      duration: '60 dk',
      platform: 'Netflix',
      description: 'Modern teknolojinin hayatımıza getirdiği karanlık ve düşündürücü etkiler.'
    },
    {
      name: 'Succession',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
      imdbScore: 8.8,
      duration: '60 dk',
      platform: 'HBO Max',
      description: 'Medya devi Roy ailesinin, yaşlanan babalarının ardından şirketin kontrolünü ele geçirme mücadelesi.'
    }
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // AKTİVİTE — Gerçek mekan adları + akıllı mapsQuery
  // ─────────────────────────────────────────────────────────────────────────
  aktivite: [
    {
      name: 'Cinemaximum',
      mapsQuery: 'Cinemaximum İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
      budget: '₺₺',
      description: 'Türkiye\'nin en büyük sinema zinciri. Vizyondaki son filmleri dolby ses ve geniş perdede izleyin.'
    },
    {
      name: 'Strike Bowling (Akasya)',
      mapsQuery: 'Strike Bowling Akasya AVM İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1538510121173-07e7efd2551f?w=600&q=80',
      budget: '₺₺',
      location: 'Acıbadem',
      description: 'Akasya AVM içindeki modern bowling merkezi. Arkadaşlarla rekabetçi ve eğlenceli bir bowling gecesi.'
    },
    {
      name: 'Vialand (Isfanbul)',
      mapsQuery: 'Vialand Isfanbul Tema Parkı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1534445867742-43195f401964?w=600&q=80',
      budget: '₺₺',
      location: 'Eyüp',
      description: 'Türkiye\'nin en büyük tema parkı. Hız treni, çarpışan arabalar ve aquaparkla unutulmaz bir gün.'
    },
    {
      name: 'Sahil Yürüyüşü (Caddebostan)',
      mapsQuery: 'Caddebostan sahil yürüyüş yolu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      budget: 'Bedava',
      location: 'Caddebostan',
      description: 'Marmara Denizi kıyısında bisiklet ve yürüyüş yollarıyla donatılmış İstanbul\'un en güzel sahil şeridi.'
    },
    {
      name: 'DevArt Müzesi',
      mapsQuery: 'DevArt Müzesi Beyoğlu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
      budget: '₺',
      location: 'Beyoğlu',
      description: 'Dijital sanat ve interaktif enstalasyonlarla dolu modern müze. Her ziyarette farklı bir deneyim.'
    },
    {
      name: 'Emirgan Korusu Piknik',
      mapsQuery: 'Emirgan Korusu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=600&q=80',
      budget: '₺',
      location: 'Emirgan',
      description: 'Boğaz\'a nazır, Türkiye\'nin en güzel lale bahçelerini barındıran tarihi koruluğunda piknik keyfi.'
    },
    {
      name: 'Beşiktaş Çarşı Karaoke',
      mapsQuery: 'Karaoke bar Beşiktaş İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
      budget: '₺₺',
      location: 'Beşiktaş',
      description: 'Beşiktaş\'taki karaoke barlarında mikrofonu eline al ve sevdiğin şarkıları bağıra çağıra söyle!'
    },
    {
      name: 'Devlet Tiyatroları',
      mapsQuery: 'İstanbul Devlet Tiyatroları',
      imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      budget: '₺₺',
      description: 'İstanbul\'da birden fazla sahnede gösteri yapan devlet tiyatrosu. Uygun fiyata kaliteli tiyatro keyfi.'
    },
    {
      name: 'Sky Trampolines',
      mapsQuery: 'Sky Trampolines İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1556819031-bf55851a09d8?w=600&q=80',
      budget: '₺₺',
      description: 'İstanbul\'un en büyük trambolin parkı. Yerçekimine meydan oku, zıpla, takla at ve bol enerji harca!'
    },
    {
      name: 'Formula Kart Go-Kart',
      mapsQuery: 'Formula Kart Go-Kart İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80',
      budget: '₺₺₺',
      description: 'İstanbul\'un profesyonel go-kart pisti. Adrenalin tutkunları için pistin tozunu yutturacak bir yarış.'
    },
    {
      name: 'Çamlıca Tepesi Gezisi',
      mapsQuery: 'Büyük Çamlıca Tepesi İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80',
      budget: 'Bedava',
      location: 'Üsküdar',
      description: 'İstanbul\'un iki yakasını ve Boğaz\'ı gören eşsiz panoramik manzarasıyla Büyük Çamlıca Tepesi\'nde vakit geçirmek.'
    },
    {
      name: 'O\'Garden SPA',
      mapsQuery: 'O Garden SPA Şişli İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
      budget: '₺₺₺₺',
      location: 'Şişli',
      description: 'Şehrin stresini atan, hamam ve masaj seanslarıyla lüks bir SPA deneyimi.'
    },
    {
      name: 'Boğaz Turu (Şehir Hatları)',
      mapsQuery: 'Şehir Hatları Boğaz turu İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80',
      budget: '₺',
      description: 'Şehir Hatları vapuruyla Boğaz\'ın iki yakasını gezerek köprüler, yalılar ve tarihi yapıları seyredin.'
    },
    {
      name: 'Oyun Dükkânı (Board Game Cafe)',
      mapsQuery: 'Board game cafe İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80',
      budget: '₺₺',
      description: 'Yüzlerce kutu oyun seçeneğiyle dolu kafede Catan, Tabu ve daha fazlasıyla eğlenceli saatler.'
    },
    {
      name: 'İstanbul Modern',
      mapsQuery: 'İstanbul Modern Sanat Müzesi Karaköy',
      imageUrl: 'https://images.unsplash.com/photo-1578926288207-32357be5fbb7?w=600&q=80',
      budget: '₺₺',
      location: 'Karaköy',
      description: 'Türkiye\'nin en önemli çağdaş sanat müzesi. Boğaz manzaralı yeni binasında Türk ve uluslararası sanat eserleri.'
    },
  ]
};

// Aliases for English category names
mockOptions.food   = mockOptions.mekan;
mockOptions.movie  = mockOptions.film;
mockOptions.activity = mockOptions.aktivite;
