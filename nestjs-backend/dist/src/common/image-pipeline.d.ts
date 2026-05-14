export interface ImageVariant {
    size: number;
    jpeg: string;
    webp: string;
    avif: string;
}
export interface ProcessImageOptions {
    sizes?: number[];
    cover?: number;
    jpegQuality?: number;
    webpQuality?: number;
    avifQuality?: number;
    writeLegacy?: boolean;
}
export declare function processImage(buf: Buffer, baseDir: string, baseName: string, opts?: ProcessImageOptions): Promise<{
    variants: ImageVariant[];
    legacyJpeg: string | null;
}>;
