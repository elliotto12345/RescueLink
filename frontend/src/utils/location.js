/** Haversine distance in kilometers between two lat/lon points */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function sortMechanicsByDistance(mechanics, userLat, userLon) {
  return [...mechanics]
    .map((mechanic) => ({
      ...mechanic,
      distanceKm: getDistanceKm(
        userLat,
        userLon,
        mechanic.latitude,
        mechanic.longitude,
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
