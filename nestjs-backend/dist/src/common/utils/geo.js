"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distKm = void 0;
exports.equirectangularDist = equirectangularDist;
exports.haversine = haversine;
function equirectangularDist(lat1, lon1, lat2, lon2, R = 6371) {
    const toRad = (x) => x * Math.PI / 180;
    const x = toRad(lon2 - lon1) * Math.cos(toRad((lat1 + lat2) / 2));
    const y = toRad(lat2 - lat1);
    return R * Math.sqrt(x * x + y * y);
}
function haversine(lat1, lon1, lat2, lon2, R = 6371) {
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
const distKm = (lat1, lon1, lat2, lon2) => Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1) < 0.5
    ? equirectangularDist(lat1, lon1, lat2, lon2)
    : haversine(lat1, lon1, lat2, lon2);
exports.distKm = distKm;
//# sourceMappingURL=geo.js.map