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
    format: 'jsonv2', q: query, bounded: '1', limit: '30', addressdetails: '1',
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

const getLiveVenueOptions = async ({ room, locations, userId, limit, includeFallbackCandidates = false, strictCuisine = false }) => {
  const center = groupCenter(locations);
  const farthestMemberKm = Math.max(...locations.map((item) => haversineKm(center, item)));
  const radiusMeters = Math.min(50000, Math.max(5000, Math.ceil((farthestMemberKm + 8) * 1000)));
  const requesterLocation = locations.find((item) => item.user.toString() === userId.toString());
  const allowedTypes = room.matchResult.name.toLocaleLowerCase('tr-TR').includes('kahve')
    ? ['restaurant', 'fast_food', 'cafe']
    : ['restaurant', 'fast_food'];
  const isUsableVenue = (place) =>
      Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) &&
      place.name && place.category === 'amenity' && allowedTypes.includes(place.type);
  const matchingPlaces = (await searchNominatimPlaces({ query: `${room.matchResult.name} restaurant`, center, radiusMeters }))
    .filter(isUsableVenue);
  const genericPlaces = strictCuisine || (matchingPlaces.length >= limit && !includeFallbackCandidates)
    ? []
    : await searchNominatimPlaces({ query: 'restaurant', center, radiusMeters });
  const allCandidates = [...matchingPlaces, ...genericPlaces]
    .filter(isUsableVenue)
    .filter((place, index, list) =>
      list.findIndex((item) => item.osm_type === place.osm_type && item.osm_id === place.osm_id) === index
    );
  const matchingIds = new Set(matchingPlaces.map((place) => `${place.osm_type}-${place.osm_id}`));
  const candidatePool = strictCuisine
    ? matchingPlaces
    : (includeFallbackCandidates || matchingPlaces.length < limit
      ? allCandidates
      : allCandidates.filter((place) => matchingIds.has(`${place.osm_type}-${place.osm_id}`)));

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
    if (existingRoom) return res.json({ room: existingRoom, reused: true });

    const venues = await getLiveVenueOptions({
      room,
      locations,
      userId: req.user._id,
      limit: 10,
      includeFallbackCandidates: true,
      strictCuisine: true,
    });
    if (venues.length < 2) {
      return res.status(404).json({
        code: 'VENUES_NOT_FOUND',
        message: 'Bu konumda restoran seçimi için yeterli gerçek mekan bulunamadı.',
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
