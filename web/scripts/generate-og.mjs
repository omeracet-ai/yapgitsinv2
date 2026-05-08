// Phase 92 — generate static og-image.png (1200x630) using Sharp + SVG.
// Run once: `node scripts/generate-og.mjs`. Output: public/og-image.png.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'og-image.png');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#007DFE"/>
      <stop offset="100%" stop-color="#0056B3"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(80,180)">
    <rect width="120" height="120" rx="26" fill="#fff"/>
    <path d="M30 30 L60 75 L90 30" stroke="#007DFE" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <line x1="60" y1="75" x2="60" y2="100" stroke="#007DFE" stroke-width="12" stroke-linecap="round"/>
  </g>
  <text x="80" y="400" font-family="Inter, Arial, sans-serif" font-size="92" font-weight="800" fill="#fff">Yapgitsin</text>
  <text x="80" y="475" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="500" fill="rgba(255,255,255,0.92)">Türkiye'nin hizmet marketplace platformu</text>
  <text x="80" y="540" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.78)">Temizlik · Tadilat · Elektrik · Tesisat · ve daha fazlası</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log('wrote', out);
