"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distKm = void 0;
exports.encodeGeohash = encodeGeohash;
exports.decodeGeohash = decodeGeohash;
exports.geohashNeighbors = geohashNeighbors;
exports.equirectangular = equirectangular;
exports.haversine = haversine;
exports.precisionForRadiusKm = precisionForRadiusKm;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_DECODE = {};
for (let i = 0; i < BASE32.length; i++)
    BASE32_DECODE[BASE32[i]] = i;
function encodeGeohash(lat, lon, precision = 6) {
    if (typeof lat !== 'number' ||
        typeof lon !== 'number' ||
        isNaN(lat) ||
        isNaN(lon)) {
        return '';
    }
    let latRange = [-90, 90];
    let lonRange = [-180, 180];
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
            }
            else {
                bits = bits << 1;
                lonRange = [lonRange[0], mid];
            }
        }
        else {
            const mid = (latRange[0] + latRange[1]) / 2;
            if (lat >= mid) {
                bits = (bits << 1) | 1;
                latRange = [mid, latRange[1]];
            }
            else {
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
function decodeGeohash(hash) {
    let latRange = [-90, 90];
    let lonRange = [-180, 180];
    let even = true;
    for (const c of hash) {
        const cd = BASE32_DECODE[c];
        if (cd == null)
            break;
        for (let mask = 16; mask > 0; mask >>= 1) {
            if (even) {
                const mid = (lonRange[0] + lonRange[1]) / 2;
                if (cd & mask)
                    lonRange = [mid, lonRange[1]];
                else
                    lonRange = [lonRange[0], mid];
            }
            else {
                const mid = (latRange[0] + latRange[1]) / 2;
                if (cd & mask)
                    latRange = [mid, latRange[1]];
                else
                    latRange = [latRange[0], mid];
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
function adjacent(hash, dir) {
    const NEIGHBOR = {
        n: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
        s: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
        e: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
        w: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
    };
    const BORDER = {
        n: ['prxz', 'bcfguvyz'],
        s: ['028b', '0145hjnp'],
        e: ['bcfguvyz', 'prxz'],
        w: ['0145hjnp', '028b'],
    };
    const lastCh = hash[hash.length - 1];
    let parent = hash.slice(0, -1);
    const type = hash.length % 2;
    if (BORDER[dir][type].includes(lastCh) && parent !== '') {
        parent = adjacent(parent, dir);
    }
    return parent + BASE32[NEIGHBOR[dir][type].indexOf(lastCh)];
}
function geohashNeighbors(hash) {
    if (!hash)
        return [];
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
function equirectangular(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const x = (toRad(lon2 - lon1)) * Math.cos(toRad((lat1 + lat2) / 2));
    const y = toRad(lat2 - lat1);
    return Math.sqrt(x * x + y * y) * R;
}
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
const distKm = (lat1, lon1, lat2, lon2) => Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1) < 0.5
    ? equirectangular(lat1, lon1, lat2, lon2)
    : haversine(lat1, lon1, lat2, lon2);
exports.distKm = distKm;
function precisionForRadiusKm(radiusKm) {
    if (radiusKm <= 2)
        return 6;
    if (radiusKm <= 7)
        return 5;
    if (radiusKm <= 50)
        return 4;
    return 3;
}
//# sourceMappingURL=geohash.util.js.map