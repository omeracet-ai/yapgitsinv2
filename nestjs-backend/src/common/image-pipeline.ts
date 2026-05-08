/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
/**
 * Phase 96 — Image Pipeline
 * Generates JPEG/WebP/AVIF responsive variants from a single input buffer.
 *
 * Naming convention (web side relies on this):
 *   <baseDir>/<baseName>-<size>.{jpg,webp,avif}
 *   <baseDir>/<baseName>.jpg          (legacy / largest fallback)
 *
 * Frontend `getImageVariants(url)` parses the legacy URL and synthesizes
 * the responsive variant URLs without a DB lookup.
 */
import { join } from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

export interface ImageVariant {
  size: number;
  jpeg: string;
  webp: string;
  avif: string;
}

export interface ProcessImageOptions {
  /** Largest width to render (default 1024). Smaller sizes scale down. */
  sizes?: number[];
  /** If set, force square cover crop (e.g. avatar 512). */
  cover?: number;
  /** JPEG quality (default 80). */
  jpegQuality?: number;
  /** WebP quality (default 80). */
  webpQuality?: number;
  /** AVIF quality (default 60 — visually equivalent to ~q80 JPEG). */
  avifQuality?: number;
  /** Also write a legacy `<baseName>.jpg` (largest size) for backward compat. */
  writeLegacy?: boolean;
}

/**
 * Render multiple sizes × 3 formats from a single buffer.
 * Returns relative filenames (no URL prefix).
 */
export async function processImage(
  buf: Buffer,
  baseDir: string,
  baseName: string,
  opts: ProcessImageOptions = {},
): Promise<{ variants: ImageVariant[]; legacyJpeg: string | null }> {
  const sizes = opts.sizes ?? [1024, 640, 320];
  const jpegQ = opts.jpegQuality ?? 80;
  const webpQ = opts.webpQuality ?? 80;
  const avifQ = opts.avifQuality ?? 60;
  const writeLegacy = opts.writeLegacy ?? true;

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const variants: ImageVariant[] = [];
  for (const size of sizes) {
    let pipeline = sharp(buf);
    if (opts.cover) {
      pipeline = pipeline.resize(size, size, { fit: 'cover', position: 'center' });
    } else {
      pipeline = pipeline.resize({ width: size, withoutEnlargement: true });
    }
    // Reuse the same metadata-resized buffer for 3 encodes.
    const resized = await pipeline.toBuffer();

    const jpegName = `${baseName}-${size}.jpg`;
    const webpName = `${baseName}-${size}.webp`;
    const avifName = `${baseName}-${size}.avif`;

    await Promise.all([
      sharp(resized).jpeg({ quality: jpegQ, mozjpeg: true }).toFile(join(baseDir, jpegName)),
      sharp(resized).webp({ quality: webpQ }).toFile(join(baseDir, webpName)),
      sharp(resized).avif({ quality: avifQ, effort: 4 }).toFile(join(baseDir, avifName)),
    ]);

    variants.push({ size, jpeg: jpegName, webp: webpName, avif: avifName });
  }

  // Legacy fallback file: largest size as plain `<baseName>.jpg`.
  let legacyJpeg: string | null = null;
  if (writeLegacy) {
    const largest = sizes[0];
    const src = join(baseDir, `${baseName}-${largest}.jpg`);
    legacyJpeg = `${baseName}.jpg`;
    fs.copyFileSync(src, join(baseDir, legacyJpeg));
  }

  return { variants, legacyJpeg };
}
