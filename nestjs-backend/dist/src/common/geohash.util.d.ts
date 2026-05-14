export declare function encodeGeohash(lat: number, lon: number, precision?: number): string;
export declare function decodeGeohash(hash: string): {
    lat: number;
    lon: number;
    latErr: number;
    lonErr: number;
};
export declare function geohashNeighbors(hash: string): string[];
export declare function equirectangular(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare const distKm: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
export declare function precisionForRadiusKm(radiusKm: number): number;
