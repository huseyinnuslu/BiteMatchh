import Room from '../models/Room.js';
import LocationShare from '../models/LocationShare.js';
import { getIo } from '../server.js';

const LOCATION_TTL_MS = 15 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;

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
        imageIsRepresentative: false,
        imageAttribution: 'Wikimedia Commons',
        imageSourceUrl: `https://commons.wikimedia.org/wiki/File:${encodedFileName}`,
      };
    }
  }

  return {
    imageUrl: fallbackImageUrl || '',
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
];

const normalizeFoodName = (value = '') => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i');

const getFoodVenueProfile = (foodName) => {
  const normalizedName = normalizeFoodName(foodName);
  return FOOD_VENUE_PROFILES.find((profile) =>
    profile.names.some((name) => normalizedName.includes(name))
  ) || {
    queries: [foodName],
    types: DEFAULT_FOOD_VENUE_TYPES,
  };
};

const getLiveVenueOptions = async ({ room, locations, userId, limit }) => {
  const center = groupCenter(locations);
  const farthestMemberKm = Math.max(...locations.map((item) => haversineKm(center, item)));
  const radiusMeters = Math.min(50000, Math.max(5000, Math.ceil((farthestMemberKm + 8) * 1000)));
  const requesterLocation = locations.find((item) => item.user.toString() === userId.toString());
  const profile = getFoodVenueProfile(room.matchResult.name);
  const allowedTypes = new Set(profile.types || DEFAULT_FOOD_VENUE_TYPES);
  const isUsableVenue = (place) =>
      Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) &&
      place.name && allowedTypes.has(`${place.category}:${place.type}`);
  const candidatePool = [];
  const seenVenueIds = new Set();

  for (const query of profile.queries) {
    const places = await searchNominatimPlaces({ query, center, radiusMeters });
    places.filter(isUsableVenue).forEach((place) => {
      const venueId = `${place.osm_type}-${place.osm_id}`;
      if (!seenVenueIds.has(venueId)) {
        seenVenueIds.add(venueId);
        candidatePool.push(place);
      }
    });
    if (candidatePool.length >= limit) break;
  }

  return candidatePool
    .map((place) => {
      const coordinates = { latitude: Number(place.lat), longitude: Number(place.lon) };
      const distances = locations.map((location) => haversineKm(location, coordinates));
      const maxGroupDistanceKm = Math.max(...distances);
      const distanceScore = Math.max(0, 1 - maxGroupDistanceKm / (radiusMeters / 1000));
      const address = [
        place.address?.road,
        place.address?.neighbourhood || place.address?.quarter || place.address?.suburb,
        place.address?.city || place.address?.town || place.address?.province,
      ].filter(Boolean).join(', ');
      const venueImage = getVenueImage(place, room.matchResult.imageUrl);
      return {
        id: `osm-${place.osm_type}-${place.osm_id}`,
        name: place.name,
        address: address || place.display_name || '',
        rating: null,
        reviewCount: null,
        priceLevel: '',
        primaryType: place.type,
        mapsUrl: osmMapsUrl(coordinates.latitude, coordinates.longitude),
        googleMapsUrl: osmMapsUrl(coordinates.latitude, coordinates.longitude),
        source: 'OpenStreetMap',
        attribution: '© OpenStreetMap contributors',
        ...venueImage,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        distanceFromYouKm: requesterLocation ? Number(haversineKm(requesterLocation, coordinates).toFixed(1)) : null,
        maxGroupDistanceKm: Number(maxGroupDistanceKm.toFixed(1)),
        recommendationScore: Number(distanceScore.toFixed(4)),
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
};

const getEligibleRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId).select('host participants status category matchResult');
  if (!room) { const error = new Error('Oda bulunamadı'); error.statusCode = 404; throw error; }
  if (!isRoomParticipant(room, userId)) { const error = new Error('Bu oda için mekan önerisi alma yetkiniz yok'); error.statusCode = 403; throw error; }
  if (room.status !== 'finished' || !room.matchResult?.name) { const error = new Error('Mekan önerileri için önce yemek eşleşmesi tamamlanmalıdır'); error.statusCode = 400; throw error; }
  if (!['mekan', 'food'].includes(room.category)) {
    const error = new Error('Restoran onerileri yalnizca yemek odalarinda kullanilabilir');
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
    const recommendations = await getLiveVenueOptions({
      room,
      locations,
      userId: req.user._id,
      limit: 3,
    });

    res.json({ cuisine: room.matchResult.name, participantCount: room.participants.length, recommendations });
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
          option.imageIsRepresentative = true;
          option.imageAttribution = 'Temsili kategori görseli';
          imageAdded = true;
        }
      });
      if (imageAdded) await existingRoom.save();
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

    const restaurantRoom = await Room.create({
      name: `${room.name} • Nerede Yiyelim?`,
      host: room.host,
      participants: room.participants,
      category: 'restaurant',
      parentRoom: room._id,
      restaurantSort: sortBy,
      status: 'voting',
      votingStartedAt: new Date(),
      options: venues.map((venue) => ({
        name: venue.name,
        imageUrl: venue.imageUrl,
        imageIsRepresentative: venue.imageIsRepresentative,
        imageAttribution: venue.imageAttribution,
        imageSourceUrl: venue.imageSourceUrl,
        description: `Grubun en uzaktaki üyesine ${venue.maxGroupDistanceKm} km uzaklıkta.`,
        location: venue.address,
        mapsQuery: `${venue.name} ${venue.address}`,
        latitude: venue.latitude,
        longitude: venue.longitude,
      })),
    });

    getIo()?.to(room._id.toString()).emit('restaurant_round_ready', {
      parentRoomId: room._id.toString(),
      roomId: restaurantRoom._id.toString(),
    });
    res.status(201).json({ room: restaurantRoom, reused: false });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};
