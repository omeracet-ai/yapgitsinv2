/**
 * Phase 96 — ResponsiveImage
 *
 * Renders <picture> with AVIF → WebP → JPEG fallback chain, using the
 * naming convention emitted by nestjs-backend/src/common/image-pipeline.ts.
 *
 * Old uploads (no -1024/-640/-320 siblings) gracefully fall back to a plain
 * <img> via getImageVariants() returning hasVariants:false.
 */
import { getImageVariants, buildSrcSet } from '@/lib/image';

interface Props {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  /** CSS sizes attr, e.g. "(max-width: 768px) 100vw, 640px". Defaults to 100vw. */
  sizes?: string;
  /** Above-the-fold critical image — sets fetchPriority=high, eager loading. */
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ResponsiveImage({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  priority = false,
  className,
  style,
}: Props) {
  const variants = getImageVariants(src);
  if (!variants) {
    // No source at all — render nothing.
    return null;
  }

  const loading = priority ? 'eager' : 'lazy';
  // React 19 supports lowercase fetchpriority; cast for older typings.
  const fetchPriority = (priority ? 'high' : 'auto') as 'high' | 'low' | 'auto';

  // Legacy / external URL — plain <img>, no variants.
  if (!variants.hasVariants) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={variants.fallback}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        className={className}
        style={style}
      />
    );
  }

  const avifSet = buildSrcSet(variants, 'avif');
  const webpSet = buildSrcSet(variants, 'webp');
  const jpegSet = buildSrcSet(variants, 'jpeg');
  const largestJpeg = variants.sizes[0]?.jpeg ?? variants.fallback;

  return (
    <picture>
      <source type="image/avif" srcSet={avifSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSet} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={largestJpeg}
        srcSet={jpegSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        className={className}
        style={style}
      />
    </picture>
  );
}
