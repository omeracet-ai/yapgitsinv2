/**
 * Phase 177 — Geohash + equirectangular distance utilities.
 *
 * Why:
 *   - Haversine over a full table scan is O(n); for >100k rows this is hot.
 *   - Geohash prefix lets the DB index narrow candidates to 9 cells (center +
 *     8 neighbors) before any JS distance math.
 *   - Equirectangular is ~10x faster than Haversine and accurate enough below
 *     ~50km — exactly the radius range we use (1–200km, mostly <50).
 *
 * Precision reference (geohash):
 *   precision 4 → ~39km cell
 *   precision 5 → ~4.9km cell   (used for radius queries)
 *   precision 6 → ~1.2km cell   (stored on rows for finer prefix matches)
 *   precision 7 → ~153m cell
 *
 * Cell choice: store at 6 (good locality), query prefix at 5 (covers radius
 * up to ~5km cell + 8 neighbors ≈ 15km bbox; for larger radius we widen to
 * precision 4).
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_DECODE: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) BASE32_DECODE[BASE32[i]] = i;

/** Encode (lat, lon) into a geohash string. */
export function encodeGeohash(
  lat: number,
  lon: number,
  precision = 6,
): string {
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    isNaN(lat) ||
    isNaN(lon)
  ) {
    return '';
  }
  let latRange: [number, number] = [-90, 90];
  let lonRange: [number, number] = [-180, 180];
  let hash = '';
  let bits = 0;
  let bit = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        bits = (bits << 1) | 1;
        lonRange = [mid, lonRange[1]];
      } else {
        bits = bits << 1;
        lonRange = [lonRange[0], mid];
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latRange = [mid, latRange[1]];
      } else {
        bits = bits << 1;
        latRange = [latRange[0], mid];
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

/** Decode a geohash to its bbox center + bbox corners. */
export function decodeGeohash(hash: string): {
  lat: number;
  lon: number;
  latErr: number;
  lonErr: number;
} {
  let latRange: [number, number] = [-90, 90];
  let lonRange: [number, number] = [-180, 180];
  let even = true;
  for (const c of hash) {
    const cd = BASE32_DECODE[c];
    if (cd == null) break;
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (even) {
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (cd & mask) lonRange = [mid, lonRange[1]];
        else lonRange = [lonRange[0], mid];
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (cd & mask) latRange = [mid, latRange[1]];
        else latRange = [latRange[0], mid];
      }
      even = !even;
    }
  }
  const lat = (latRange[0] + latRange[1]) / 2;
  const lon = (lonRange[0] + lonRange[1]) / 2;
  return {
    lat,
    lon,
    latErr: (latRange[1] - latRange[0]) / 2,
    lonErr: (lonRange[1] - lonRange[0]) / 2,
  };
}

/** Adjacent cell in one of n/s/e/w directions. */
function adjacent(hash: string, dir: 'n' | 's' | 'e' | 'w'): string {
  const NEIGHBOR: Record<string, [string, string]> = {
    n: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
    s: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
    e: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
    w: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
  };
  const BORDER: Record<string, [string, string]> = {
    n: ['prxz', 'bcfguvyz'],
    s: ['028b', '0145hjnp'],
    e: ['bcfguvyz', 'prxz'],
    w: ['0145hjnp', '028b'],
  };
  const lastCh = hash[hash.length - 1];
  let parent = hash.slice(0, -1);
  const type = hash.length % 2; // 0 even, 1 odd
  if (BORDER[dir][type].includes(lastCh) && parent !== '') {
    parent = adjacent(parent, dir);
  }
  return parent + BASE32[NEIGHBOR[dir][type].indexOf(lastCh)];
}

/** Center hash + 8 neighbors (n, ne, e, se, s, sw, w, nw). */
export function geohashNeighbors(hash: string): string[] {
  if (!hash) return [];
  const n = adjacent(hash, 'n');
  const s = adjacent(hash, 's');
  return [
    hash,
    n,
    adjacent(n, 'e'),
    adjacent(hash, 'e'),
    adjacent(s, 'e'),
    s,
    adjacent(s, 'w'),
    adjacent(hash, 'w'),
    adjacent(n, 'w'),
  ];
}

/**
 * Equirectangular approximation — ~10x faster than Haversine.
 * Accurate to <0.5% below 50km, fine for radius filtering.
 */
export function equirectangular(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = (toRad(lon2 - lon1)) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = toRad(lat2 - lat1);
  return Math.sqrt(x * x + y * y) * R;
}

/** Haversine — exact great-circle distance, used as fallback / for >50km. */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Smart dispatcher: equirectangular for <50km (~10x faster), Haversine otherwise.
 */
export const distKm = (lat1: number, lon1: number, lat2: number, lon2: number): number =>
  Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1) < 0.5
    ? equirectangular(lat1, lon1, lat2, lon2)
    : haversine(lat1, lon1, lat2, lon2);

/**
 * Pick prefix length for a given radius (km).
 * Returns the geohash precision whose cell-size envelope covers the radius
 * with the 3x3 neighbor block.
 *   precision 6 (~1.2km × 9 cells ≈ 3.6km bbox) → radius <= 2km
 *   precision 5 (~4.9km × 9 cells ≈ 14km bbox)  → radius <= 7km
 *   precision 4 (~39km × 9 cells ≈ 117km bbox)  → radius <= 50km
 *   precision 3 (~156km × 9 cells)              → radius <= 200km
 */
export function precisionForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 2) return 6;
  if (radiusKm <= 7) return 5;
  if (radiusKm <= 50) return 4;
  return 3;
}
