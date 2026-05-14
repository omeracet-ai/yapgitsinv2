export declare const MONEY_SCALE = 100;
export declare function tlToMinor(tl: number | null | undefined): number | null;
export declare function minorToTl(minor: number | null | undefined): number | null;
export declare function formatMinor(minor: number, locale?: string): string;
export declare function addMinor(...vals: number[]): number;
export declare function subMinor(a: number, b: number): number;
export declare function pctOfMinor(minor: number, pct: number): number;
