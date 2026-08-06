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

const priceLabel = (value) => ({
  PRICE_LEVEL_INEXPENSIVE: '₺', PRICE_LEVEL_MODERATE: '₺₺',
  PRICE_LEVEL_EXPENSIVE: '₺₺₺', PRICE_LEVEL_VERY_EXPENSIVE: '₺₺₺₺',
}[value] || '');

const getEligibleRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId).select('participants status category matchResult');
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
    if (!process.env.GOOGLE_MAPS_API_KEY) { res.status(503); throw new Error('Gerçek mekan verisi için Places API henüz yapılandırılmamış'); }

    const center = groupCenter(locations);
    const farthestMemberKm = Math.max(...locations.map((item) => haversineKm(center, item)));
    const radiusMeters = Math.min(50000, Math.max(5000, Math.ceil((farthestMemberKm + 8) * 1000)));
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.primaryType',
      },
      body: JSON.stringify({
        textQuery: `${room.matchResult.name} restaurant`, languageCode: 'tr', regionCode: 'TR', pageSize: 20,
        locationBias: { circle: { center, radius: radiusMeters } },
      }),
    });
    if (!response.ok) throw new Error(`Places API hatası: ${await response.text()}`);

    const { places = [] } = await response.json();
    const requesterLocation = locations.find((item) => item.user.toString() === req.user._id.toString());
    const recommendations = places
      .filter((place) => place.location && place.displayName?.text)
      .map((place) => {
        const distances = locations.map((location) => haversineKm(location, place.location));
        const maxGroupDistanceKm = Math.max(...distances);
        const distanceScore = Math.max(0, 1 - maxGroupDistanceKm / (radiusMeters / 1000));
        const ratingScore = Math.min(Math.max(Number(place.rating) || 0, 0), 5) / 5;
        const reviewConfidence = Math.min(Math.log10((Number(place.userRatingCount) || 0) + 1) / 4, 1);
        return {
          id: place.id, name: place.displayName.text, address: place.formattedAddress || '', rating: place.rating || null,
          reviewCount: place.userRatingCount || 0, priceLevel: priceLabel(place.priceLevel), primaryType: place.primaryType || 'restaurant',
          googleMapsUrl: place.googleMapsUri || '', source: 'Google Maps',
          distanceFromYouKm: requesterLocation ? Number(haversineKm(requesterLocation, place.location).toFixed(1)) : null,
          maxGroupDistanceKm: Number(maxGroupDistanceKm.toFixed(1)),
          recommendationScore: Number((distanceScore * 0.5 + ratingScore * 0.4 + reviewConfidence * 0.1).toFixed(4)),
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 3);

    res.json({ cuisine: room.matchResult.name, participantCount: room.participants.length, recommendations });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};
