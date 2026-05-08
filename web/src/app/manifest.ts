// Phase 95 — PWA manifest (Next.js 16 metadata route convention).
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yapgitsin — Hizmet Platformu',
    short_name: 'Yapgitsin',
    description:
      "Türkiye'nin hizmet marketplace platformu — temizlik, tadilat, elektrik, tesisat ve daha fazlası.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#007DFE',
    background_color: '#FFFFFF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
