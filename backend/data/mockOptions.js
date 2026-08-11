import { curatedCatalogAdditions } from './curatedCatalogAdditions.js';

/**
 * mockOptions.js – BiteMatch Kart Havuzu
 *
 * MEKAN  → "Nereye Gidelim?" — yemek TÜRÜ seçilir, Maps o türdeki gerçek restoranları gösterir
 * FİLM   → Film/dizi adları
 * AKTİVİTE → Aktivite türleri, gerçek mekan isimleriyle veya tür aramasıyla
 *
 * mapsQuery: Maps'te bu metin aranır → gerçek sonuçlar döner
 * imageUrl : konuyla birebir eşleşen Unsplash fotoğrafı
 */

export const mockOptions = {

  // ──────────────────────────────────────────────────────────────────────────
  // MEKAN — Yemek TÜRÜ seçimi ("Ne Yiyelim?")
  // Maps'te o türdeki restoranlar listelenir → gerçek, yakın, puanlı sonuçlar
  // ──────────────────────────────────────────────────────────────────────────
  mekan: [
    {
      name: 'Hamburger',
      mapsQuery: 'en iyi hamburger İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
      budget: '₺₺',
      description: 'Juicy, çıtır ve doyurucu. Hangi hamburgerciye gidelim kararını Maps\'e bırakıyoruz.'
    },
    {
      name: 'Pizza',
      mapsQuery: 'en iyi pizza İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
      budget: '₺₺',
      description: 'İnce hamur mu, kalın mı? Odun fırını mı, İtalyan mı? Seç, Maps yakınındakileri göstersin.'
    },
    {
      name: 'Sushi & Japon',
      mapsQuery: 'sushi restaurant İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80',
      budget: '₺₺₺',
      description: 'Taze somon, avokado, maki, nigiri… Şehrin en iyi sushi restoranlarına Maps\'ten bak.'
    },
    {
      name: 'Adana Kebap',
      mapsQuery: 'Adana kebap İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&q=80',
      budget: '₺₺',
      description: 'Közde pişmiş Adana kebabı, lavş, közlenmiş biber. Türk mutfağının zirvesi.'
    },
    {
      name: 'Tantuni',
      mapsQuery: 'tantuni İstanbul',
      // Unsplash'ta doğrudan “Turkish Street food. A meat durum called Tantuni” olarak etiketlenmiş fotoğraf.
      imageUrl: 'https://unsplash.com/photos/0bEl03R6jVY/download?force=true&w=1200',
      budget: '₺',
      description: 'İnce kıyma, lavaş, domates, maydanoz ve bol sumak. Hızlı ve lezzetli sokak yemeği.'
    },
    {
      name: 'Döner',
      mapsQuery: 'döner İstanbul',
      // Dönerin dikey şişte pişmesini gösteren, başlıkla birebir eşleşen fotoğraf.
      imageUrl: 'https://unsplash.com/photos/9Lsxip60s20/download?force=true&w=1200',
      budget: '₺',
      description: 'Çıtır ekmek, bol et, közlenmiş sebze. Türkiye\'nin en sevilen fast food klasiği.'
    },
    {
      name: 'Lahmacun & Pide',
      mapsQuery: 'lahmacun pide İstanbul',
      // Unsplash başlığı: “Delicious looking turkish lahmacun ready to be served”.
      imageUrl: 'https://unsplash.com/photos/CAmLnpQXcIY/download?force=true&w=1200',
      budget: '₺',
      description: 'Çıtır ince hamurda kıymalı lahmacun veya fırın pidesi. Rulo yapıp maydanozla ye!'
    },
    {
      name: 'Deniz Ürünleri',
      mapsQuery: 'balık restaurant İstanbul Boğaz',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80',
      budget: '₺₺₺',
      description: 'Taze çipura, levrek, kalamar tava. Boğaz veya Marmara kenarında balık keyfi.'
    },
    {
      name: 'Steakhouse & Et',
      mapsQuery: 'steakhouse İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1594046243098-0fceea9d451e?w=600&q=80',
      budget: '₺₺₺',
      description: 'Özel dinlendirilmiş etler, antrikot, t-bone ve enfes şarap eşleşmeleri.'
    },
    {
      name: 'Fine Dining & Şef Mutfağı',
      mapsQuery: 'fine dining restaurant İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
      budget: '₺₺₺',
      description: 'Ödüllü şeflerin imza tabakları, tadım menüleri ve şık bir atmosfer.'
    },
    {
      name: 'Ramen & Asya Mutfağı',
      mapsQuery: 'ramen Asya mutfağı İstanbul',
      imageUrl: 'https://unsplash.com/photos/qom5MPOER-I/download?force=true&w=1200',
      budget: '₺₺',
      description: 'Sıcak et suyunda el yapımı noodle, marine yumurta ve zengin umami lezzeti.'
    },
    {
      name: 'Serpme Kahvaltı',
      mapsQuery: 'serpme kahvaltı İstanbul',
      imageUrl: 'https://unsplash.com/photos/2zvJVYujXVk/download?force=true&w=1200',
      budget: '₺₺',
      description: 'Bal, kaymak, peynir çeşitleri, zeytin, sıcak pişi ve demlik çay. Bol çeşitli serpme kahvaltı.'
    },
    {
      name: 'Pasta & Tatlı Kafe',
      mapsQuery: 'pastane kafe İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80',
      budget: '₺₺',
      description: 'Cheesecake mi, sufle mi, tiramisu mu? Şehrin en iyi pastanelerinde tatlı mola.'
    },
    {
      name: 'Tost & Sandviç',
      mapsQuery: 'sandviç tost kafe İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
      budget: '₺',
      description: 'Sıcak ve doyurucu. Boğaz usulü balık ekmek ya da bol malzemeli bir gurme sandviç.'
    },
    {
      name: 'Meksika & Taco',
      mapsQuery: 'Meksika yemeği taco İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
      budget: '₺₺',
      description: 'Guacamole, baharatlı kıyma ve çıtır nacho. İstanbul\'daki Meksika restoranlarına göz at.'
    },
    {
      name: 'Makarna & İtalyan',
      mapsQuery: 'İtalyan restaurant makarna İstanbul',
      imageUrl: 'https://unsplash.com/photos/971_E-LvZuc/download?force=true&w=1200',
      budget: '₺₺',
      description: 'El yapımı taze makarna, carbonara, risotto. Otantik İtalyan lezzeti şehirde.'
    },
    {
      name: 'Köfte',
      mapsQuery: 'köfte restaurant İstanbul',
      imageUrl: 'https://unsplash.com/photos/5oKQi6bug2A/download?force=true&w=1200',
      budget: '₺',
      description: 'Izgarada çıtırdayan köfte, kavurma patates ve cacık. Türk mutfağının vazgeçilmezi.'
    },
    {
      name: 'Kıymalı Pide',
      mapsQuery: 'kıymalı pide İstanbul',
      imageUrl: 'https://unsplash.com/photos/ASu5R2cd25E/download?force=true&w=1200',
      budget: '₺',
      discoveryGroup: 'turkish-bakery',
      venueConcept: 'Fırın & esnaf lokantası',
      description: 'Taş fırından çıkan kıymalı pideyle hızlı, sıcak ve paylaşmalık bir öğün.'
    },
    {
      name: 'Tavuk Kanat & Çıtır Tavuk',
      mapsQuery: 'tavuk kanat çıtır tavuk İstanbul',
      imageUrl: 'https://unsplash.com/photos/gE28aTnlqJA/download?force=true&w=1200',
      budget: '₺₺',
      discoveryGroup: 'chicken',
      venueConcept: 'Casual dining',
      description: 'Soslu kanat, çıtır tavuk ve paylaşmalık atıştırmalıklar için rahat bir akşam seçeneği.'
    },
    {
      name: 'Vegan & Healthy Bowl',
      mapsQuery: 'vegan healthy bowl İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'healthy',
      venueConcept: 'Sağlıklı kafe',
      description: 'Taze sebzeler, tahıllar ve bitkisel proteinlerle hafif ama doyurucu bir buluşma.'
    },
    {
      name: 'Hint Mutfağı & Köri',
      mapsQuery: 'Hint mutfağı köri İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'international-spice',
      venueConcept: 'Dünya mutfağı',
      description: 'Baharatlı köri, pilav ve naan eşliğinde aroması güçlü bir dünya mutfağı molası.'
    },
    {
      name: 'Wok & Noodle',
      mapsQuery: 'wok noodle İstanbul',
      // Önceki görsel "Cajun dirty rice" idi. Bu fotoğraf doğrudan stir-fry noodle gösterir.
      imageUrl: 'https://unsplash.com/photos/cVqU6I87fjQ/download?force=true&w=1200',
      budget: '₺₺',
      discoveryGroup: 'asian-noodle',
      venueConcept: 'Hızlı Asya mutfağı',
      description: 'Sebze, et veya tofu seçerek kişiselleştirilebilen sıcak wok tabakları.'
    },
    {
      name: 'Salata & Akdeniz Mutfağı',
      mapsQuery: 'Akdeniz mutfağı salata İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'healthy',
      venueConcept: 'Günlük kafe',
      description: 'Renkli mevsim sebzeleri, zeytinyağlılar ve ferah Akdeniz tabakları.'
    },
    {
      name: 'Brunch & Kafe',
      mapsQuery: 'brunch kafe İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'brunch',
      venueConcept: 'Kafe & brunch',
      description: 'Yumurta, ekşi mayalı ekmek ve kahveyle uzun sohbetlere uygun geç kahvaltı.'
    },
    {
      name: 'Kahve & Pastane',
      mapsQuery: 'kahve pastane İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=85',
      budget: '₺',
      discoveryGroup: 'cafe-dessert',
      venueConcept: 'Üçüncü nesil kafe',
      description: 'Nitelikli kahve, taze pasta ve kısa bir buluşma için sıcak bir kafe seçeneği.'
    },
    {
      name: 'Falafel & Levanten',
      mapsQuery: 'falafel Levanten mutfağı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1741980597454-54f338cea614?w=1200&q=85',
      budget: '₺',
      discoveryGroup: 'middle-east',
      venueConcept: 'Sokak lezzetleri',
      description: 'Falafel, humus ve tahin eşliğinde paylaşmaya uygun Levanten lezzetleri.'
    },
    {
      name: 'Tatlı & Waffle',
      mapsQuery: 'waffle tatlı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1662751421284-9faa7d4f8302?w=1200&q=85',
      budget: '₺',
      discoveryGroup: 'cafe-dessert',
      venueConcept: 'Tatlıcı',
      description: 'Meyve, çikolata ve dondurmayla keyifli bir tatlı kaçamağı.'
    },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // FİLM
  // ──────────────────────────────────────────────────────────────────────────
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
      name: 'Oppenheimer',
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      imdbScore: 8.3,
      duration: '180 dk',
      platform: 'Prime Video',
      description: 'Atom bombasını geliştiren J. Robert Oppenheimer\'in trajik hikayesi.'
    },
    {
      name: 'Fight Club',
      imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80',
      imdbScore: 8.8,
      duration: '139 dk',
      platform: 'Prime Video',
      description: 'Monoton bir hayata sahip olan anlatıcının kurduğu yeraltı dövüş kulübü.'
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
      imageUrl: 'https://images.unsplash.com/photo-1655560584182-293458a88fa9?w=1200&q=85',
      imdbScore: 9.2,
      duration: '57 dk',
      platform: 'HBO Max',
      description: 'Westeros\'un yedi krallığındaki taht kavgaları ve kuzeyden gelen antik tehdit.'
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
      description: 'Medya devi Roy ailesinin şirketin kontrolünü ele geçirme mücadelesi.'
    },
    {
      name: 'The Bear',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80',
      imdbScore: 8.6,
      duration: '30 dk',
      platform: 'Disney+',
      description: 'Michelin yıldızlı şef Carmy\'nin aile lokantasını devralmak zorunda kalması. Yüksek tempo, gerçekçi mutfak draması.'
    },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // AKTİVİTE — "Ne Yapalım?"
  // mapsQuery → Maps'te o tür aktivite mekanları çıkar
  // ──────────────────────────────────────────────────────────────────────────
  aktivite: [
    {
      name: 'Sinemaya Git',
      mapsQuery: 'sinema İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
      budget: '₺₺',
      description: 'Vizyondaki en yeni filmi dev perdede izlemek. Maps\'ten yakınındaki sinemaya bak.'
    },
    {
      name: 'Bowling',
      mapsQuery: 'bowling İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1671959986201-db542c4456d8?w=1200&q=85',
      budget: '₺₺',
      description: 'Grev mi, spare mi? Rekabetçi ve eğlenceli bir bowling gecesi için Maps\'te yakın salonu bul.'
    },
    {
      name: 'Lunapark & Tema Parkı',
      mapsQuery: 'lunapark tema parkı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1640904940493-96a49045039a?w=1200&q=85',
      budget: '₺₺',
      description: 'Hız treni, çarpışan arabalar, dönme dolap. Çocukluğa dönüş ve adrenalin keyfi.'
    },
    {
      name: 'Sahil & Park Yürüyüşü',
      mapsQuery: 'sahil park yürüyüş İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      budget: 'Bedava',
      description: 'Deniz havası, müzik ve sohbet eşliğinde huzurlu bir yürüyüş. Tamamen bedava!'
    },
    {
      name: 'Canlı Konser',
      mapsQuery: 'konser etkinlik İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80',
      budget: '₺₺₺',
      description: 'Sevdiğin sanatçıyı canlı izle, coş, dans et. Biletix veya Passo\'dan yaklaşan konserlere bak.'
    },
    {
      name: 'Müze & Galeri',
      mapsQuery: 'müze sanat galerisi İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
      budget: '₺',
      description: 'İstanbul\'un tarihi veya modern sanat müzelerini gezerek kültürel bir tur.'
    },
    {
      name: 'Karaoke',
      mapsQuery: 'karaoke bar İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
      budget: '₺₺',
      description: 'Mikrofonu eline al, en sevdiğin şarkıları bağıra çağıra söyle. Utanma, eğlen!'
    },
    {
      name: 'Tiyatro',
      mapsQuery: 'tiyatro İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      budget: '₺₺',
      description: 'Komedi, dram veya müzikal — usta oyuncuların sahnelediği oyunu canlı izlemek.'
    },
    {
      name: 'Trambolin Parkı',
      mapsQuery: 'trambolin parkı İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?w=600&q=80',
      budget: '₺₺',
      description: 'Yerçekimine meydan oku! Trambolin parklarında zıpla, takla at, enerji harca.'
    },
    {
      name: 'Go-Kart',
      mapsQuery: 'go kart pisti İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80',
      budget: '₺₺₺',
      description: 'Pistte gaz ver, rakibini geç! Adrenalin dolu bir go-kart yarışı için Maps\'ten pist bul.'
    },
    {
      name: 'Boğaz Turu',
      mapsQuery: 'Boğaz turu vapur İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80',
      budget: '₺',
      description: 'Vapur veya tekneyle Boğaz\'ı gezerek köprüleri, yalıları ve tarihi yapıları seyret.'
    },
    {
      name: 'Board Game Kafe',
      mapsQuery: 'board game kutu oyunu kafe İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80',
      budget: '₺₺',
      description: 'Yüzlerce kutu oyun seçeneğiyle dolu kafede Catan, Tabu ve daha fazlasıyla bol eğlence.'
    },
    {
      name: 'SPA & Masaj',
      mapsQuery: 'spa masaj merkezi İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
      budget: '₺₺₺₺',
      description: 'Haftanın yorgunluğunu üzerimizden atacak rahatlatıcı bir SPA ve masaj seansı.'
    },
    {
      name: 'Bisiklet Turu',
      mapsQuery: 'bisiklet kiralama İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80',
      budget: '₺',
      description: 'Ormanda veya sahil şeridinde rüzgarı hissederek pedal çevirme keyfi. İSBAK bisikleti de olur!'
    },
    {
      name: 'Piknik',
      mapsQuery: 'piknik alanı park İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=600&q=80',
      budget: '₺',
      description: 'Çimenlere yay, yiyecekleri hazırla, müziği aç. Emirgan, Fenerbahçe Parkı veya Çamlıca.'
    },
    {
      name: 'Canlı Sahne Performansı',
      mapsQuery: 'canlı performans İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'live-stage',
      venueConcept: 'Canlı sahne',
      description: 'Müzik, komedi veya akustik performanslarla akşamı canlı ve kolay planlanır bir buluşmaya çevirin.'
    },
    {
      name: 'Seramik Atölyesi',
      mapsQuery: 'seramik atölyesi İstanbul',
      // Unsplash başlığı: “Messy hands sculpting on a pottery wheel in motion”.
      imageUrl: 'https://unsplash.com/photos/xEy9QNUCdRI/download?force=true&w=1200',
      budget: '₺₺',
      discoveryGroup: 'workshop',
      venueConcept: 'Yaratıcı atölye',
      description: 'Çamura şekil verip kendi kupanızı veya küçük objenizi üretebileceğiniz sakin bir aktivite.'
    },
    {
      name: 'Tırmanış Duvarı',
      mapsQuery: 'tırmanış duvarı boulder İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=85',
      budget: '₺₺',
      discoveryGroup: 'active',
      venueConcept: 'Spor & macera',
      description: 'Başlangıç rotalarıyla da keyifli olan, birlikte hareket etmeye teşvik eden boulder deneyimi.'
    },
    {
      name: 'Buz Pateni',
      mapsQuery: 'buz pateni İstanbul',
      // Bu URL daha önce kürek ergometresi gösteriyordu; kart şimdi doğrudan buz pistindeki patenciyi gösterir.
      imageUrl: 'https://images.pexels.com/photos/6539392/pexels-photo-6539392.jpeg?auto=compress&cs=tinysrgb&w=1200',
      budget: '₺₺',
      discoveryGroup: 'active',
      venueConcept: 'Spor & eğlence',
      description: 'Müzik eşliğinde piste çıkıp birlikte yeni bir şey denemek için eğlenceli bir seçenek.'
    },
    {
      name: 'Yemek Atölyesi',
      mapsQuery: 'yemek atölyesi İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85',
      budget: '₺₺₺',
      discoveryGroup: 'workshop',
      venueConcept: 'Mutfak atölyesi',
      description: 'Bir şef eşliğinde tarif öğrenip sonunda hazırladıklarınızı birlikte tadabileceğiniz deneyim.'
    },
    {
      name: 'Fotoğraf Yürüyüşü',
      mapsQuery: 'fotoğraf yürüyüşü İstanbul',
      imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=85',
      budget: 'Bedava',
      discoveryGroup: 'outdoor',
      venueConcept: 'Şehir keşfi',
      description: 'Telefon veya fotoğraf makinesiyle şehrin farklı bir semtini keşfedin; rota tamamen size ait.'
    },
  ]
};

mockOptions.mekan.push(...curatedCatalogAdditions.mekan);
mockOptions.film.push(...curatedCatalogAdditions.film);
mockOptions.aktivite.push(...curatedCatalogAdditions.aktivite);

// Aynı konseptin art arda gelmesini önlemek için eski kartlara da keşif grubu verilir.
// Bu alan, kart bileşenleri tarafından kullanılmaz; yalnızca havuzun dengeli seçimi içindir.
const foodGroups = {
  'Hamburger': 'burger',
  'Pizza': 'italian',
  'Sushi & Japon': 'japanese',
  'Adana Kebap': 'turkish-grill',
  'Tantuni': 'turkish-street-food',
  'Döner': 'turkish-street-food',
  'Lahmacun & Pide': 'turkish-bakery',
  'Deniz Ürünleri': 'seafood',
  'Steakhouse & Et': 'steakhouse',
  'Fine Dining & Şef Mutfağı': 'fine-dining',
  'Ramen & Asya Mutfağı': 'asian-noodle',
  'Serpme Kahvaltı': 'brunch',
  'Pasta & Tatlı Kafe': 'cafe-dessert',
  'Tost & Sandviç': 'sandwich',
  'Meksika & Taco': 'mexican',
  'Makarna & İtalyan': 'italian',
  'Köfte': 'turkish-grill',
};

const activityGroups = {
  'Sinemaya Git': 'screen',
  'Bowling': 'game',
  'Lunapark & Tema Parkı': 'adrenaline',
  'Sahil & Park Yürüyüşü': 'outdoor',
  'Canlı Konser': 'live-stage',
  'Müze & Galeri': 'culture',
  'Karaoke': 'live-stage',
  'Tiyatro': 'live-stage',
  'Trambolin Parkı': 'active',
  'Go-Kart': 'adrenaline',
  'Boğaz Turu': 'outdoor',
  'Board Game Kafe': 'game',
  'SPA & Masaj': 'wellness',
  'Bisiklet Turu': 'outdoor',
  'Piknik': 'outdoor',
};

mockOptions.mekan.forEach((item) => {
  item.discoveryGroup ||= foodGroups[item.name] || 'food';
});
mockOptions.aktivite.forEach((item) => {
  item.discoveryGroup ||= activityGroups[item.name] || 'activity';
});

const shuffleCards = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

/**
 * Oda havuzunu rastgele tutarken her mutfak/etkinlik konseptinden önce bir temsilci alır.
 * Böylece örneğin art arda birkaç kebap veya yalnızca tek bütçe bandı gösterilmez.
 */
export const selectDiverseOptions = (sourcePool, count) => {
  const grouped = new Map();
  const budgetGroups = new Map();

  sourcePool.forEach((item) => {
    const group = item.discoveryGroup || 'other';
    grouped.set(group, [...(grouped.get(group) || []), item]);

    const budget = item.budget || 'unspecified';
    budgetGroups.set(budget, [...(budgetGroups.get(budget) || []), item]);
  });

  const selected = new Set();
  const addRepresentative = (items) => {
    const next = shuffleCards(items).find((item) => !selected.has(item));
    if (next && selected.size < count) selected.add(next);
  };

  // Birden fazla fiyat seviyesi mevcutsa, her seviyeden önce bir temsilci alınır.
  shuffleCards([...budgetGroups.values()]).forEach(addRepresentative);
  // Ardından farklı mutfak/etkinlik konseptleriyle keşif çeşitliliği tamamlanır.
  shuffleCards([...grouped.values()]).forEach(addRepresentative);

  const remaining = sourcePool.filter((item) => !selected.has(item));

  return shuffleCards([...selected, ...shuffleCards(remaining)]).slice(0, count);
};

// English aliases
mockOptions.food     = mockOptions.mekan;
mockOptions.movie    = mockOptions.film;
mockOptions.activity = mockOptions.aktivite;
