import Room from '../models/Room.js';
import LocationShare from '../models/LocationShare.js';
import { getIo } from '../server.js';

const LOCATION_TTL_MS = 15 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;
// Arama ve doğrulama kuralları değiştiğinde devam eden odalardaki öneriler
// güvenli şekilde yeniden hesaplanır; bitmiş geçmiş kararlar korunur.
const RESTAURANT_RECOMMENDATION_VERSION = 5;
const FOURSQUARE_PLACES_URL = 'https://places-api.foursquare.com/places/search';
const FOURSQUARE_API_VERSION = '2025-06-17';
const FOURSQUARE_CACHE_TTL_MS = 5 * 60 * 1000;
const foursquareCache = new Map();

const isFoursquareConfigured = () => Boolean(process.env.FOURSQUARE_PLACES_API_KEY?.trim());

const isRoomParticipant = (room, userId) =>
  room.participants.some((participant) => participant.toString() === userId.toString());

const parseCoordinate = (value, min, max) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
};

const haversineKm = (from, to) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const groupCenter = (locations) => ({
  latitude: locations.reduce((sum, item) => sum + item.latitude, 0) / locations.length,
  longitude: locations.reduce((sum, item) => sum + item.longitude, 0) / locations.length,
});

const osmMapsUrl = (latitude, longitude) =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;

const getVenueImage = (place, fallbackImageUrl) => {
  const commonsTag = String(place.extratags?.wikimedia_commons || '').trim();
  if (commonsTag.toLowerCase().startsWith('file:')) {
    const fileName = commonsTag.slice(5).trim();
    if (fileName) {
      const encodedFileName = encodeURIComponent(fileName);
      return {
        imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFileName}?width=1000`,
        fallbackImageUrl: fallbackImageUrl || '',
        imageIsRepresentative: false,
        imageAttribution: 'Wikimedia Commons',
        imageSourceUrl: `https://commons.wikimedia.org/wiki/File:${encodedFileName}`,
      };
    }
  }

  return {
    imageUrl: fallbackImageUrl || '',
    fallbackImageUrl: fallbackImageUrl || '',
    imageIsRepresentative: true,
    imageAttribution: fallbackImageUrl ? 'Temsili kategori görseli' : '',
    imageSourceUrl: '',
  };
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_CACHE_TTL_MS = 5 * 60 * 1000;
const nominatimCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

// Nominatim'in ortak sunucusu en fazla saniyede bir istek ister. Testte de
// buna uyuyor, ayni aramayi bes dakika bellekte tutuyoruz.
const fetchNominatim = (url) => {
  const request = async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimRequestAt = Date.now();
    return fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BiteMatch/0.1 (bitematchinfo@gmail.com)',
      },
      signal: AbortSignal.timeout(15000),
    });
  };
  const scheduledRequest = nominatimQueue.then(request, request);
  nominatimQueue = scheduledRequest.catch(() => undefined);
  return scheduledRequest;
};

const searchNominatimPlaces = async ({ query, center, radiusMeters }) => {
  const cacheKey = `${query}:${center.latitude.toFixed(3)}:${center.longitude.toFixed(3)}:${radiusMeters}`;
  const cached = nominatimCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;

  const latitudeDelta = radiusMeters / 111320;
  const longitudeDelta = radiusMeters / (111320 * Math.max(Math.cos((center.latitude * Math.PI) / 180), 0.1));
  const params = new URLSearchParams({
    format: 'jsonv2', q: query, bounded: '1', limit: '30', addressdetails: '1', extratags: '1',
    viewbox: `${center.longitude - longitudeDelta},${center.latitude + latitudeDelta},${center.longitude + longitudeDelta},${center.latitude - latitudeDelta}`,
  });
  const response = await fetchNominatim(`${NOMINATIM_URL}?${params}`);
  if (!response.ok) {
    const error = new Error('Mekan verisi su anda alinamadi. Lutfen biraz sonra tekrar deneyin.');
    error.statusCode = 502;
    throw error;
  }
  const places = await response.json();
  nominatimCache.set(cacheKey, { places, expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS });
  return places;
};

const DEFAULT_FOOD_VENUE_TYPES = ['amenity:restaurant', 'amenity:fast_food', 'amenity:cafe'];

const FOOD_VENUE_PROFILES = [
  { names: ['hamburger'], queries: ['burger', 'hamburger'] },
  { names: ['pizza'], queries: ['pizzeria', 'Little Caesars', 'pizza'] },
  { names: ['sushi', 'japon'], queries: ['sushi', 'japon restoranı'] },
  { names: ['adana kebap'], queries: ['adana kebap', 'kebap'] },
  { names: ['tantuni'], queries: ['tantuni'] },
  { names: ['doner'], queries: ['döner'] },
  { names: ['lahmacun'], queries: ['lahmacun', 'pide'] },
  { names: ['deniz urunleri'], queries: ['balık restoranı', 'seafood'] },
  { names: ['steakhouse'], queries: ['steakhouse', 'et restoranı'] },
  { names: ['fine dining'], queries: ['fine dining', 'şef restoranı'] },
  { names: ['ramen'], queries: ['ramen', 'asya restoranı'] },
  { names: ['serpme kahvalti'], queries: ['kahvaltı', 'breakfast'], types: ['amenity:restaurant', 'amenity:cafe'] },
  { names: ['pasta & tatli'], queries: ['pastane', 'pasta'], types: ['shop:confectionery', 'shop:bakery', 'amenity:cafe', 'amenity:ice_cream'] },
  { names: ['tost'], queries: ['tost', 'sandviç'] },
  { names: ['meksika'], queries: ['taco', 'meksika restoranı'] },
  { names: ['makarna'], queries: ['italyan restoranı', 'makarna'] },
  { names: ['kofte'], queries: ['köfte'] },
  { names: ['kiymali pide'], queries: ['pide', 'kıymalı pide'] },
  { names: ['tavuk kanat'], queries: ['tavuk', 'chicken'] },
  { names: ['vegan'], queries: ['vegan', 'healthy bowl'], types: ['amenity:restaurant', 'amenity:cafe', 'amenity:fast_food'] },
  { names: ['hint mutfagi'], queries: ['hint restoranı', 'indian restaurant'] },
  { names: ['wok'], queries: ['noodle', 'wok'] },
  { names: ['salata'], queries: ['salata', 'vegan', 'akdeniz restoranı'] },
  { names: ['brunch'], queries: ['brunch', 'kahvaltı'], types: ['amenity:cafe', 'amenity:restaurant'] },
  { names: ['kahve'], queries: ['kahve', 'pastane'], types: ['amenity:cafe', 'shop:coffee', 'shop:confectionery', 'shop:bakery'] },
  { names: ['falafel'], queries: ['falafel', 'levanten restoranı'] },
  { names: ['tatli & waffle'], queries: ['waffle', 'pastane', 'tatlıcı'], types: ['shop:confectionery', 'shop:bakery', 'amenity:cafe', 'amenity:ice_cream', 'amenity:restaurant'] },
  { names: ['manti'], queries: ['mantı', 'ev yemekleri'] },
  { names: ['iskender'], queries: ['iskender kebap', 'bursa kebabı', 'kebap'] },
  { names: ['cig kofte'], queries: ['çiğ köfte'] },
  { names: ['kumpir'], queries: ['kumpir'] },
  { names: ['kokorec'], queries: ['kokoreç', 'midye dolma'] },
  { names: ['balik ekmek'], queries: ['balık ekmek', 'balık restoranı'] },
  { names: ['baklava'], queries: ['baklava', 'katmer', 'tatlıcı'], types: ['shop:confectionery', 'shop:bakery', 'amenity:cafe'] },
  { names: ['simit'], queries: ['simit', 'çay'], types: ['shop:bakery', 'amenity:cafe'] },
  { names: ['kore mutfagi'], queries: ['kore restoranı', 'korean restaurant', 'bibimbap'] },
  { names: ['dondurma'], queries: ['dondurma', 'gelato'], types: ['amenity:ice_cream', 'amenity:cafe', 'shop:confectionery'] },
];

const normalizeFoodName = (value = '') => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i');

const GENERIC_VENUE_WORDS = new Set(['restaurant', 'restoran', 'restorani', 'mutfagi', 'sef', 'chef', 'food']);

const venueSearchText = (place) => normalizeFoodName([
  place.name,
  place.extratags?.brand,
  place.extratags?.cuisine,
  place.extratags?.description,
].filter(Boolean).join(' '));

const venueMatchesFoodProfile = (place, profile) => {
  // Nominatim'de "cafe" veya "confectionery" olması tek başına seçilen
  // yemeği sattığını kanıtlamaz. Tostta tost, pizzada pizza gibi bir iz,
  // işletme adında, markasında veya OSM mutfak etiketinde bulunmalıdır.
  const keywords = (profile.keywords || [...(profile.names || []), ...(profile.queries || [])])
    .flatMap((value) => normalizeFoodName(value).split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 4 && !GENERIC_VENUE_WORDS.has(word));
  const searchableText = venueSearchText(place);
  return keywords.some((keyword) => searchableText.includes(keyword));
};

const venueVerificationScore = (place) => {
  const address = place.address || {};
  const tags = place.extratags || {};
  let score = 0;
  if (address.house_number) score += 3;
  if (address.road || address.pedestrian) score += 2;
  if (address.postcode) score += 1;
  if (tags.website || tags['contact:website']) score += 3;
  if (tags.phone || tags['contact:phone']) score += 2;
  if (tags.brand || tags['brand:wikidata'] || tags.wikidata || tags.wikipedia) score += 3;
  if (tags.opening_hours) score += 1;
  if (tags.wikimedia_commons || tags.image) score += 1;
  return score;
};

const hasNavigableVenueAddress = (place) => {
  const address = place.address || {};
  const tags = place.extratags || {};
  const hasStreetOrVenue = !!(address.road || address.pedestrian || address.mall || address.retail || address.building);
  // Bir sokak adı veya bina numarası tek başına buranın güncel bir işletme
  // olduğunu kanıtlamaz. Kullanıcıya yalnızca dışarıdan doğrulanabilir bir
  // işletme izi olan ve navigasyona uygun adres taşıyan mekanları gösteririz.
  const hasBusinessIdentity = !!(
    tags.website || tags['contact:website'] ||
    tags.phone || tags['contact:phone'] ||
    tags.brand || tags['brand:wikidata'] ||
    tags.wikidata || tags.wikipedia
  );
  return hasStreetOrVenue && hasBusinessIdentity;
};

const formatVenueAddress = (place) => {
  const address = place.address || {};
  const street = [address.road || address.pedestrian, address.house_number ? `No:${address.house_number}` : '']
    .filter(Boolean).join(' ');
  const rawParts = [
    address.mall || address.retail || address.building,
    street,
    address.neighbourhood || address.quarter || address.suburb,
    address.town || address.municipality || address.district || address.county,
    address.city || address.province || address.state,
    address.postcode,
  ].filter(Boolean);
  const seen = new Set();
  return rawParts.filter((part) => {
    const normalized = normalizeFoodName(String(part)).replace(/[^a-z0-9]/g, '');
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).join(', ');
};

const getFoodVenueProfile = (foodName) => {
  const normalizedName = normalizeFoodName(foodName);
  return FOOD_VENUE_PROFILES.find((profile) =>
    profile.names.some((name) => normalizedName.includes(name))
  ) || {
    queries: [foodName],
    types: DEFAULT_FOOD_VENUE_TYPES,
  };
};

const getFoursquareCoordinates = (place) => {
  // Places Search koordinatı güncel API'de çoğunlukla üst seviyede döndürür.
  // `location` ise adres bilgisidir; onu ilk seçmek bütün gerçek sonuçların
  // koordinatsız sanılıp elenmesine yol açıyordu.
  const coordinateSources = [place.geocodes?.main, place.geocodes?.roof, place, place.location];
  for (const coordinates of coordinateSources) {
    const latitude = Number(coordinates?.latitude ?? coordinates?.lat);
    const longitude = Number(coordinates?.longitude ?? coordinates?.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  return null;
};

const getFoursquareAddress = (place) => {
  const location = place.location || {};
  const formatted = String(place.formatted_address || location.formatted_address || '').trim();
  const parts = [
    place.address || location.address,
    place.locality || location.locality,
    place.region || location.region,
  ].map((part) => String(part || '').trim()).filter(Boolean);

  // Bazı sonuçlarda `formatted_address` yalnızca "34349" gibi bir posta kodu
  // oluyor. Bu kullanıcıyı gerçek işletmeye götürmez; adı + açık adresi olan
  // mekanlar dışında sonuç üretmemek için burada reddedilir.
  const isPostalCodeOnly = /^\d{4,6}$/.test(formatted.replace(/\s/g, ''));
  if (!isPostalCodeOnly && formatted && /[\p{L}]/u.test(formatted)) return formatted;
  return [...new Set(parts.map((part) => String(part).trim()))].join(', ');
};

const hasReliableFoursquareAddress = (place, address) => {
  const location = place.location || {};
  const street = String(place.address || location.address || '').trim();
  const locality = String(place.locality || location.locality || '').trim();
  const region = String(place.region || location.region || '').trim();
  const normalizedAddress = String(address || '').trim();

  // Salt posta kodu, yalnızca ilçe adı veya boş konum bir mekan adresi değildir.
  if (!normalizedAddress || /^\d{4,6}$/.test(normalizedAddress.replace(/\s/g, ''))) return false;

  // Kullanıcıya yönlendirme için en az bir sokak/bina bilgisi ve onu şehirde
  // anlamlı kılan bir ilçe/şehir parçası gerekir. Böylece yalnız "Cadde X"
  // veya "Beşiktaş" gibi belirsiz kayıtlar önerilmez.
  const hasStreetDetail = /[\p{L}]/u.test(street) && street.length >= 4;
  const hasAreaDetail = /[\p{L}]/u.test(locality) || /[\p{L}]/u.test(region);
  return hasStreetDetail && hasAreaDetail;
};

const getFoursquareCategoryNames = (place) => {
  const categories = place.categories || place.fsq_categories || [];
  return categories
    .map((category) => typeof category === 'string'
      ? category
      : category.name || category.fsq_category_name || category.label || category.fsq_category_label)
    .filter(Boolean)
};

const isCinemaRoom = (room) => ['film', 'movie'].includes(room.category);

const getVenueSearch = (room) => {
  if (isCinemaRoom(room)) {
    return { query: 'cinema', venueType: 'cinema', screenFormat: null };
  }
  const profile = getFoodVenueProfile(room.matchResult.name);
  return {
    query: profile.queries?.[0] || room.matchResult.name,
    venueType: 'restaurant',
    screenFormat: null,
  };
};

const getCinemaScreenFormat = (place) => {
  const text = normalizeFoodName([place.name, ...getFoursquareCategoryNames(place)].filter(Boolean).join(' '));
  return text.includes('imax') ? 'IMAX' : '';
};

const searchFoursquarePlaces = async ({ query, center, radiusMeters }) => {
  if (!isFoursquareConfigured()) {
    const error = new Error('Restoran önerileri için Foursquare Places bağlantısı henüz yapılandırılmadı.');
    error.statusCode = 503;
    error.code = 'PLACES_NOT_CONFIGURED';
    throw error;
  }

  const cacheKey = `${query}:${center.latitude.toFixed(3)}:${center.longitude.toFixed(3)}:${radiusMeters}`;
  const cached = foursquareCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;

  const params = new URLSearchParams({
    query,
    ll: `${center.latitude},${center.longitude}`,
    radius: String(radiusMeters),
    limit: '50',
    sort: 'RELEVANCE',
    // Foursquare açık adresi `location.formatted_address` içinde döndürür.
    // Yalnızca Place Search'ün desteklediği alanları isteyerek 400 hatasını önleriz.
    fields: 'fsq_place_id,name,latitude,longitude,location,categories,distance,website,tel',
  });
  const response = await fetch(`${FOURSQUARE_PLACES_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.FOURSQUARE_PLACES_API_KEY.trim()}`,
      'X-Places-Api-Version': FOURSQUARE_API_VERSION,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    console.warn(`[Foursquare Places] search failed with HTTP ${response.status}`);
    const error = new Error(response.status === 401 || response.status === 403
      ? 'Restoran veri sağlayıcısı yetkilendirilemedi. API anahtarı kontrol edilmeli.'
      : 'Gerçek restoran verisi şu anda alınamadı. Lütfen biraz sonra tekrar deneyin.');
    error.statusCode = response.status === 401 || response.status === 403 ? 503 : 502;
    error.code = 'PLACES_PROVIDER_ERROR';
    throw error;
  }

  const payload = await response.json();
  const places = Array.isArray(payload.results) ? payload.results : [];
  foursquareCache.set(cacheKey, { places, expiresAt: Date.now() + FOURSQUARE_CACHE_TTL_MS });
  return places;
};

const getLiveVenueOptions = async ({ room, locations, userId, limit }) => {
  const center = groupCenter(locations);
  const farthestMemberKm = Math.max(...locations.map((item) => haversineKm(center, item)));
  // Katılımcılar aynı yerdeyse 5 km, birbirinden uzaktalarsa ortak merkeze
  // göre ölçülü biçimde genişleyen bir alan kullanırız. "Yakın" öneri,
  // şehrin rastgele başka bir ucundan gelemez.
  const maxGroupDistanceKm = Math.min(20, Math.max(5, Number((farthestMemberKm + 4).toFixed(1))));
  const radiusMeters = Math.min(25000, Math.max(5000, Math.ceil((maxGroupDistanceKm + 1) * 1000)));
  const requesterLocation = locations.find((item) => item.user.toString() === userId.toString());
  const venueSearch = getVenueSearch(room);
  const { query, venueType } = venueSearch;
  const places = await searchFoursquarePlaces({ query, center, radiusMeters });

  const rejectionCounts = { missingIdentity: 0, missingCoordinates: 0, missingAddress: 0, unreliableAddress: 0, outsideGroupArea: 0 };
  const venues = places
    .map((place, index) => ({ place, index, coordinates: getFoursquareCoordinates(place), address: getFoursquareAddress(place) }))
    .filter(({ place, coordinates, address }) => {
      // Foursquare araması seçilen yemek terimiyle yapılır ve sonuçlar kendi
      // Places veritabanından gelir. Burada tekrar kategori adına göre elemek,
      // "Turkish Restaurant" gibi geçerli kategorileri yanlışlıkla dışarıda
      // bırakıyordu. Kimlik + açık adres + koordinat ise zorunlu kalır.
      if (!place.fsq_place_id || !place.name) {
        rejectionCounts.missingIdentity += 1;
        return false;
      }
      if (!coordinates) {
        rejectionCounts.missingCoordinates += 1;
        return false;
      }
      if (!address) {
        rejectionCounts.missingAddress += 1;
        return false;
      }
      if (!hasReliableFoursquareAddress(place, address)) {
        rejectionCounts.unreliableAddress += 1;
        return false;
      }
      const venueMaxGroupDistanceKm = Math.max(...locations.map((location) => haversineKm(location, coordinates)));
      if (venueMaxGroupDistanceKm > maxGroupDistanceKm) {
        rejectionCounts.outsideGroupArea += 1;
        return false;
      }
      return true;
    })
    .map(({ place, index, coordinates, address }) => {
      const distances = locations.map((location) => haversineKm(location, coordinates));
      const venueMaxGroupDistanceKm = Math.max(...distances);
      const distanceScore = Math.max(0, 1 - venueMaxGroupDistanceKm / maxGroupDistanceKm);
      const relevanceScore = Math.max(0, 1 - index / Math.max(places.length, 1));
      return {
        id: `fsq-${place.fsq_place_id}`,
        name: place.name,
        address,
        rating: null,
        reviewCount: null,
        priceLevel: '',
        primaryType: getFoursquareCategoryNames(place).join(', '),
        venueType,
        screenFormat: venueType === 'cinema' ? getCinemaScreenFormat(place) : '',
        website: typeof place.website === 'string' ? place.website : '',
        // Resmi salon sitesi varsa onu kullanırız; yoksa kullanıcıyı güncel
        // film + salon seans aramasına göndeririz. Saat uydurmayız.
        showtimesUrl: typeof place.website === 'string' && place.website
          ? place.website
          : `https://www.google.com/search?q=${encodeURIComponent(`${room.matchResult.name} ${place.name} seans`)}`,
        // Koordinat pin'i Maps'te çoğu zaman isimsiz bir nokta gösterir. İsim +
        // doğrulanmış açık adresle arama yapmak kullanıcıyı işletme sayfasına
        // götürür ve yanlış sokak/posta kodu hissini ortadan kaldırır.
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${address}`)}`,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${address}`)}`,
        source: 'Foursquare Places',
        attribution: 'Foursquare',
        imageUrl: room.matchResult.imageUrl || '',
        fallbackImageUrl: room.matchResult.imageUrl || '',
        imageIsRepresentative: true,
        imageAttribution: room.matchResult.imageUrl ? 'Temsili kategori görseli' : '',
        imageSourceUrl: '',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        distanceFromYouKm: requesterLocation ? Number(haversineKm(requesterLocation, coordinates).toFixed(1)) : null,
        maxGroupDistanceKm: Number(venueMaxGroupDistanceKm.toFixed(1)),
        verificationScore: 10,
        recommendationScore: Number((distanceScore * 0.75 + relevanceScore * 0.25).toFixed(4)),
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);

  console.info('[Foursquare Places] venue selection', {
    cuisine: room.matchResult.name,
    query,
    providerResultCount: places.length,
    eligibleVenueCount: venues.length,
    rejectionCounts,
  });
  return venues;
};

const recommendationForStorage = (venue) => ({
  venueId: venue.id,
  name: venue.name,
  address: venue.address,
  imageUrl: venue.imageUrl,
  fallbackImageUrl: venue.fallbackImageUrl,
  imageIsRepresentative: venue.imageIsRepresentative,
  imageAttribution: venue.imageAttribution,
  imageSourceUrl: venue.imageSourceUrl,
  mapsUrl: venue.mapsUrl,
  venueType: venue.venueType,
  screenFormat: venue.screenFormat,
  website: venue.website,
  showtimesUrl: venue.showtimesUrl,
  latitude: venue.latitude,
  longitude: venue.longitude,
  maxGroupDistanceKm: venue.maxGroupDistanceKm,
  verificationScore: venue.verificationScore,
});

const personalizeStoredRecommendations = (recommendations, requesterLocation) =>
  recommendations.map((venue) => {
    const plainVenue = venue.toObject ? venue.toObject() : venue;
    return {
      ...plainVenue,
      id: plainVenue.venueId,
      distanceFromYouKm: requesterLocation
        ? Number(haversineKm(requesterLocation, plainVenue).toFixed(1))
        : null,
    };
  });

const ensureStoredRecommendations = async ({ room, locations, userId }) => {
  const hasStoredRecommendations = room.restaurantRecommendations?.length > 0;
  const hasCurrentRecommendationVersion =
    room.restaurantRecommendationVersion === RESTAURANT_RECOMMENDATION_VERSION;
  const hasFinalDecision = ['matched', 'no_match'].includes(room.restaurantDecisionStatus);

  // Tamamlanmış bir kararı geçmişten silmeyiz. Devam eden odalarda ise eski
  // kalite kurallarıyla üretilmiş önerileri yeni sürümle yeniden hesaplarız.
  if (hasStoredRecommendations && (hasCurrentRecommendationVersion || hasFinalDecision)) {
    const needsFallback = room.restaurantRecommendations.some((venue) => !venue.fallbackImageUrl);
    if (!needsFallback || !room.matchResult.imageUrl) return room.restaurantRecommendations;

    const upgradedRecommendations = room.restaurantRecommendations.map((venue) => ({
      ...(venue.toObject ? venue.toObject() : venue),
      fallbackImageUrl: venue.fallbackImageUrl || room.matchResult.imageUrl,
    }));
    await Room.updateOne(
      { _id: room._id },
      { $set: { restaurantRecommendations: upgradedRecommendations } }
    );
    return upgradedRecommendations;
  }

  const venues = await getLiveVenueOptions({ room, locations, userId, limit: 3 });
  const storedVenues = venues.map(recommendationForStorage);
  if (storedVenues.length < 2) return [];

  const updatedRoom = await Room.findOneAndUpdate(
    {
      _id: room._id,
      restaurantDecisionStatus: 'pending',
      $or: [
        { 'restaurantRecommendations.0': { $exists: false } },
        { restaurantRecommendationVersion: { $ne: RESTAURANT_RECOMMENDATION_VERSION } },
      ],
    },
    {
      $set: {
        restaurantRecommendations: storedVenues,
        restaurantRecommendationVersion: RESTAURANT_RECOMMENDATION_VERSION,
        restaurantQuickVotes: [],
        restaurantDecisionResult: null,
        restaurantDecisionStatus: 'pending',
      },
    },
    { new: true }
  ).select('restaurantRecommendations restaurantRecommendationVersion');

  if (updatedRoom) return updatedRoom.restaurantRecommendations;
  const currentRoom = await Room.findById(room._id).select('restaurantRecommendations restaurantRecommendationVersion');
  if (currentRoom?.restaurantRecommendationVersion !== RESTAURANT_RECOMMENDATION_VERSION) return [];
  return currentRoom?.restaurantRecommendations || [];
};

const restaurantDecisionPayload = (room, userId) => ({
  decisionStatus: room.restaurantDecisionStatus || 'pending',
  completedCount: room.restaurantQuickVotes?.length || 0,
  participantCount: room.participants.length,
  hasVoted: (room.restaurantQuickVotes || []).some((vote) => vote.user.toString() === userId.toString()),
  decisionResult: room.restaurantDecisionResult?.name ? room.restaurantDecisionResult : null,
});

const getEligibleRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId).select('host participants status category matchResult restaurantRoom restaurantRecommendations restaurantRecommendationVersion restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');
  if (!room) { const error = new Error('Oda bulunamadı'); error.statusCode = 404; throw error; }
  if (!isRoomParticipant(room, userId)) { const error = new Error('Bu oda için mekan önerisi alma yetkiniz yok'); error.statusCode = 403; throw error; }
  if (room.status !== 'finished' || !room.matchResult?.name) { const error = new Error('Mekan önerileri için önce yemek veya film eşleşmesi tamamlanmalıdır'); error.statusCode = 400; throw error; }
  if (!['mekan', 'food', 'film', 'movie'].includes(room.category)) {
    const error = new Error('Mekan onerileri yalnizca yemek ve film odalarinda kullanilabilir');
    error.statusCode = 400;
    throw error;
  }
  return room;
};

// POST /api/places/rooms/:id/location
export const shareRecommendationLocation = async (req, res, next) => {
  try {
    const room = await getEligibleRoom(req.params.id, req.user._id);
    const latitude = parseCoordinate(req.body.latitude, -90, 90);
    const longitude = parseCoordinate(req.body.longitude, -180, 180);
    if (latitude === null || longitude === null) { res.status(400); throw new Error('Geçerli bir konum bilgisi gerekli'); }

    // Yaklaşık 11 metre hassasiyet öneri için yeterlidir; gereksiz hassas veriyi tutmayız.
    await LocationShare.findOneAndUpdate(
      { room: room._id, user: req.user._id },
      { latitude: Number(latitude.toFixed(4)), longitude: Number(longitude.toFixed(4)), expiresAt: new Date(Date.now() + LOCATION_TTL_MS) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const sharedCount = await LocationShare.countDocuments({ room: room._id, user: { $in: room.participants }, expiresAt: { $gt: new Date() } });
    const payload = { roomId: room._id.toString(), sharedCount, participantCount: room.participants.length };
    getIo()?.to(room._id.toString()).emit('recommendation_location_updated', payload);
    res.json({ ...payload, ready: sharedCount >= room.participants.length });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// GET /api/places/rooms/:id/recommendations
export const getRestaurantRecommendations = async (req, res, next) => {
  try {
    const room = await getEligibleRoom(req.params.id, req.user._id);
    const locations = await LocationShare.find({ room: room._id, user: { $in: room.participants }, expiresAt: { $gt: new Date() } }).lean();
    if (locations.length < room.participants.length) {
      return res.status(409).json({ code: 'LOCATION_WAITING', message: 'Tüm katılımcıların konum paylaşması bekleniyor', sharedCount: locations.length, participantCount: room.participants.length });
    }
    const storedRecommendations = await ensureStoredRecommendations({
      room,
      locations,
      userId: req.user._id,
    });
    if (storedRecommendations.length < 2) {
      return res.status(404).json({
        code: 'VERIFIED_VENUES_NOT_FOUND',
        message: `${room.matchResult.name} için yakın çevrede doğrulanabilir işletme bilgisine sahip yeterli mekan bulunamadı. Rastgele bir konum önermedik.`,
      });
    }
    const latestRoom = await Room.findById(room._id).select('participants restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');
    const requesterLocation = locations.find((item) => item.user.toString() === req.user._id.toString());
    const recommendations = personalizeStoredRecommendations(storedRecommendations, requesterLocation);

    res.json({
      cuisine: room.matchResult.name,
      recommendations,
      ...restaurantDecisionPayload(latestRoom, req.user._id),
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// GET /api/places/status
// İstemci restoran akışını yalnızca gerçek Places sağlayıcısı hazırsa açar.
export const getPlacesStatus = (_req, res) => {
  res.json({ enabled: isFoursquareConfigured(), provider: isFoursquareConfigured() ? 'foursquare' : null });
};

// POST /api/places/rooms/:id/quick-vote
// Üç hızlı öneri gizlice değerlendirilir. Kullanıcıların bireysel tercihleri
// hiçbir istemciye gönderilmez; yalnızca tamamlayan kişi sayısı paylaşılır.
export const submitRestaurantQuickVote = async (req, res, next) => {
  try {
    const room = await getEligibleRoom(req.params.id, req.user._id);
    const locations = await LocationShare.find({
      room: room._id,
      user: { $in: room.participants },
      expiresAt: { $gt: new Date() },
    }).lean();
    if (locations.length < room.participants.length) {
      return res.status(409).json({ code: 'LOCATION_WAITING', message: 'Tüm katılımcıların konum paylaşması bekleniyor' });
    }

    const recommendations = await ensureStoredRecommendations({ room, locations, userId: req.user._id });
    if (recommendations.length < 2) {
      return res.status(404).json({ code: 'VENUES_NOT_FOUND', message: 'Hızlı seçim için yeterli gerçek restoran bulunamadı.' });
    }

    const latestState = await Room.findById(room._id).select('participants restaurantRecommendations restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');
    if (latestState.restaurantDecisionStatus !== 'pending') {
      return res.json(restaurantDecisionPayload(latestState, req.user._id));
    }

    const allowedVenueIds = new Set(latestState.restaurantRecommendations.map((venue) => venue.venueId));
    const likedVenueIds = [...new Set(Array.isArray(req.body?.likedVenueIds) ? req.body.likedVenueIds : [])]
      .filter((venueId) => allowedVenueIds.has(venueId));

    await Room.updateOne(
      { _id: room._id, restaurantDecisionStatus: 'pending' },
      [{
        $set: {
          restaurantQuickVotes: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$restaurantQuickVotes', []] },
                  as: 'vote',
                  cond: { $ne: ['$$vote.user', req.user._id] },
                },
              },
              [{ user: req.user._id, likedVenueIds, completedAt: new Date() }],
            ],
          },
        },
      }],
      { updatePipeline: true }
    );

    let decisionRoom = await Room.findById(room._id).select('participants restaurantRecommendations restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');
    if (decisionRoom.restaurantQuickVotes.length >= decisionRoom.participants.length) {
      const commonVenue = decisionRoom.restaurantRecommendations.find((venue) =>
        decisionRoom.restaurantQuickVotes.every((vote) => vote.likedVenueIds.includes(venue.venueId))
      );
      const nextStatus = commonVenue ? 'matched' : 'no_match';
      const decisionResult = commonVenue ? {
        venueId: commonVenue.venueId,
        name: commonVenue.name,
        imageUrl: commonVenue.imageUrl,
        fallbackImageUrl: commonVenue.fallbackImageUrl,
        imageIsRepresentative: commonVenue.imageIsRepresentative,
        imageAttribution: commonVenue.imageAttribution,
        imageSourceUrl: commonVenue.imageSourceUrl,
        venueType: commonVenue.venueType,
        screenFormat: commonVenue.screenFormat,
        website: commonVenue.website,
        showtimesUrl: commonVenue.showtimesUrl,
        location: commonVenue.address,
        mapsQuery: `${commonVenue.name} ${commonVenue.address}`,
        latitude: commonVenue.latitude,
        longitude: commonVenue.longitude,
      } : null;

      const finalizedRoom = await Room.findOneAndUpdate(
        { _id: room._id, restaurantDecisionStatus: 'pending' },
        { $set: { restaurantDecisionStatus: nextStatus, restaurantDecisionResult: decisionResult } },
        { new: true }
      ).select('participants restaurantRecommendations restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');

      if (finalizedRoom) {
        decisionRoom = finalizedRoom;
        getIo()?.to(room._id.toString()).emit('restaurant_quick_vote_updated', {
          parentRoomId: room._id.toString(),
          ...restaurantDecisionPayload(decisionRoom, req.user._id),
          hasVoted: undefined,
        });
      } else {
        decisionRoom = await Room.findById(room._id).select('participants restaurantRecommendations restaurantQuickVotes restaurantDecisionStatus restaurantDecisionResult');
      }
    } else {
      getIo()?.to(room._id.toString()).emit('restaurant_quick_vote_updated', {
        parentRoomId: room._id.toString(),
        decisionStatus: 'pending',
        completedCount: decisionRoom.restaurantQuickVotes.length,
        participantCount: decisionRoom.participants.length,
      });
    }

    res.json(restaurantDecisionPayload(decisionRoom, req.user._id));
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// POST /api/places/rooms/:id/restaurant-room
// Eşleşen yemeğin ardından aynı katılımcılarla ikinci bir restoran oylaması başlatır.
export const createRestaurantVotingRoom = async (req, res, next) => {
  try {
    const room = await getEligibleRoom(req.params.id, req.user._id);
    const sortBy = req.body?.sortBy || 'distance';
    if (sortBy !== 'distance') {
      return res.status(422).json({
        code: 'RATING_NOT_AVAILABLE',
        message: 'Ücretsiz beta veri kaynağı güvenilir mekan puanı sağlamıyor. Şimdilik gruba en yakın seçenekler kullanılabilir.',
      });
    }

    const locations = await LocationShare.find({
      room: room._id,
      user: { $in: room.participants },
      expiresAt: { $gt: new Date() },
    }).lean();
    if (locations.length < room.participants.length) {
      return res.status(409).json({
        code: 'LOCATION_WAITING',
        message: 'Tüm katılımcıların konum paylaşması bekleniyor',
        sharedCount: locations.length,
        participantCount: room.participants.length,
      });
    }

    // Ana oda tek bir restoran oylama odasına bağlanır. İki kullanıcı aynı
    // anda butona bassa bile aşağıdaki atomik sahiplenme ikisini aynı odaya
    // yönlendirir.
    if (room.restaurantRoom) {
      const linkedRoom = await Room.findOne({
        _id: room.restaurantRoom,
        parentRoom: room._id,
        status: { $in: ['waiting', 'voting', 'finished'] },
      });
      if (linkedRoom) return res.json({ room: linkedRoom, reused: true });
      await Room.updateOne({ _id: room._id, restaurantRoom: room.restaurantRoom }, { $set: { restaurantRoom: null } });
      room.restaurantRoom = null;
    }

    const existingRoom = await Room.findOne({
      parentRoom: room._id,
      restaurantSort: sortBy,
      status: { $in: ['waiting', 'voting'] },
    });
    if (existingRoom) {
      let imageAdded = false;
      existingRoom.options.forEach((option) => {
        if (!option.imageUrl && room.matchResult.imageUrl) {
          option.imageUrl = room.matchResult.imageUrl;
          option.fallbackImageUrl = room.matchResult.imageUrl;
          option.imageIsRepresentative = true;
          option.imageAttribution = 'Temsili kategori görseli';
          imageAdded = true;
        }
      });
      if (imageAdded) await existingRoom.save();
      await Room.updateOne(
        { _id: room._id, restaurantRoom: null },
        { $set: { restaurantRoom: existingRoom._id } }
      );
      return res.json({ room: existingRoom, reused: true });
    }

    const venues = await getLiveVenueOptions({
      room,
      locations,
      userId: req.user._id,
      limit: 10,
    });
    if (venues.length < 2) {
      return res.status(404).json({
        code: 'VENUES_NOT_FOUND',
        message: `${room.matchResult.name} için bu bölgede en az iki doğrulanmış gerçek mekan bulunamadı.`,
      });
    }

    const candidateRoom = await Room.create({
      name: `${room.name} • ${isCinemaRoom(room) ? 'Nerede İzleyelim?' : 'Nerede Yiyelim?'}`,
      host: room.host,
      participants: room.participants,
      category: isCinemaRoom(room) ? 'cinema' : 'restaurant',
      parentRoom: room._id,
      restaurantSort: sortBy,
      status: 'voting',
      votingStartedAt: new Date(),
      options: venues.map((venue) => ({
        name: venue.name,
        imageUrl: venue.imageUrl,
        fallbackImageUrl: venue.fallbackImageUrl,
        imageIsRepresentative: venue.imageIsRepresentative,
        imageAttribution: venue.imageAttribution,
        imageSourceUrl: venue.imageSourceUrl,
        venueType: venue.venueType,
        screenFormat: venue.screenFormat,
        website: venue.website,
        showtimesUrl: venue.showtimesUrl,
        description: `Grubun en uzaktaki üyesine ${venue.maxGroupDistanceKm} km uzaklıkta.`,
        location: venue.address,
        mapsQuery: `${venue.name} ${venue.address}`,
        latitude: venue.latitude,
        longitude: venue.longitude,
      })),
    });

    const claimedParent = await Room.findOneAndUpdate(
      { _id: room._id, restaurantRoom: null },
      { $set: { restaurantRoom: candidateRoom._id } },
      { new: true }
    ).select('restaurantRoom');

    let restaurantRoom = candidateRoom;
    let reused = false;
    if (!claimedParent || String(claimedParent.restaurantRoom) !== String(candidateRoom._id)) {
      const latestParent = claimedParent || await Room.findById(room._id).select('restaurantRoom');
      const winningRoom = latestParent?.restaurantRoom
        ? await Room.findById(latestParent.restaurantRoom)
        : null;

      if (winningRoom) {
        await Room.deleteOne({ _id: candidateRoom._id, status: 'voting' });
        restaurantRoom = winningRoom;
        reused = true;
      } else {
        // Çok istisnai bir silinme yarışında oluşturduğumuz odayı yeniden bağla.
        await Room.updateOne({ _id: room._id }, { $set: { restaurantRoom: candidateRoom._id } });
      }
    }

    getIo()?.to(room._id.toString()).emit('restaurant_round_ready', {
      parentRoomId: room._id.toString(),
      roomId: restaurantRoom._id.toString(),
    });
    res.status(reused ? 200 : 201).json({ room: restaurantRoom, reused });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};
