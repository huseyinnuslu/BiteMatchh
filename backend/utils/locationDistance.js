export const EARTH_RADIUS_KM = 6371;

/**
 * Two geographic coordinates' straight-line distance in kilometres.
 * Coordinates are deliberately kept as latitude/longitude objects so every
 * restaurant flow uses the same calculation and rounding happens only at the
 * API boundary.
 */
export const haversineKm = (from, to) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const roundedDistanceKm = (from, to) => Number(haversineKm(from, to).toFixed(1));

export const maxGroupDistanceKm = (locations, destination) => {
  if (!Array.isArray(locations) || locations.length === 0) return null;
  return Number(Math.max(...locations.map((location) => haversineKm(location, destination))).toFixed(1));
};
