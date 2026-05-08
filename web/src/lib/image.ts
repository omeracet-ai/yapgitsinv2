/**
 * Phase 96 — Image Variants Helper
 *
 * Backend (image-pipeline.ts) writes responsive variants alongside the
 * legacy JPEG using the convention:
 *   /uploads/jobs/photo-abc.jpg                 (legacy / largest fallback)
 *   /uploads/jobs/photo-abc-1024.{jpg,webp,avif}
 *   /uploads/jobs/photo-abc-640.{jpg,webp,avif}
 *   /uploads/jobs/photo-abc-320.{jpg,webp,avif}
 *
 * Old uploads (pre-Phase 96) only have the legacy JPEG. ResponsiveImage
 * falls back to a plain <img> when isLegacy is true (best-effort detection).
 */

export interface ImageVariantSet {
  /** Largest JPEG fallback URL (always present, also legacy URLs). */
  fallback: string;
  /** Whether the URL is from a domain we can build variants for. */
  hasVariants: boolean;
  /** Variants ordered largest → smallest. */
  sizes: { size: number; jpeg: string; webp: string; avif: string }[];
}

const DEFAULT_SIZES = [1024, 640, 320];
const PROFILE_SIZES = [512, 256, 128];
const ONBOARDING_SIZES = [1200, 800, 400];

/**
 * Pick which size set applies based on URL path.
 */
function pickSizes(url: string): number[] {
  if (url.includes('/uploads/profile/')) return PROFILE_SIZES;
  if (url.includes('/uploads/onboarding/')) return ONBOARDING_SIZES;
  return DEFAULT_SIZES;
}

/**
 * Given a legacy JPEG upload URL, synthesize all variant URLs.
 * Returns hasVariants:false if the URL doesn't look like a Phase 96 upload
 * (e.g. external/CDN/old paths) — caller should render plain <img>.
 */
export function getImageVariants(url: string | null | undefined): ImageVariantSet | null {
  if (!url) return null;
  // Only our /uploads/ paths follow the convention.
  if (!url.includes('/uploads/')) {
    return { fallback: url, hasVariants: false, sizes: [] };
  }
  const m = url.match(/^(.*)\.(jpg|jpeg|png|webp)(\?.*)?$/i);
  if (!m) return { fallback: url, hasVariants: false, sizes: [] };
  const [, base] = m;
  const sizes = pickSizes(url);
  return {
    fallback: url,
    hasVariants: true,
    sizes: sizes.map((size) => ({
      size,
      jpeg: `${base}-${size}.jpg`,
      webp: `${base}-${size}.webp`,
      avif: `${base}-${size}.avif`,
    })),
  };
}

/** Build a srcSet string for one format. */
export function buildSrcSet(variants: ImageVariantSet, format: 'jpeg' | 'webp' | 'avif'): string {
  return variants.sizes.map((v) => `${v[format]} ${v.size}w`).join(', ');
}
