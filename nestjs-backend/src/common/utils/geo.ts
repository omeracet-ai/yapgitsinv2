// Equirectangular approximation — <50km için Haversine'den 10x hızlı
export function equirectangularDist(lat1: number, lon1: number, lat2: number, lon2: number, R = 6371): number {
  const toRad = (x: number) => x * Math.PI / 180;
  const x = toRad(lon2 - lon1) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = toRad(lat2 - lat1);
  return R * Math.sqrt(x * x + y * y);
}

// Full Haversine — uzun mesafeler için
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number, R = 6371): number {
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const distKm = (lat1: number, lon1: number, lat2: number, lon2: number): number =>
  Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1) < 0.5 // ~50km threshold
    ? equirectangularDist(lat1, lon1, lat2, lon2)
    : haversine(lat1, lon1, lat2, lon2);
