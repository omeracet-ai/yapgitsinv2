// Phase 95 — generate PWA icons (192/512 png) using Sharp + SVG.
// Run: `npm run generate-icons`. Output: public/icons/icon-{192,512}.png.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function svg(size) {
  const s = size;
  const r = Math.round(s * 0.18);
  const fs = Math.round(s * 0.62);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="#007DFE"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="Inter, Arial, sans-serif" font-size="${fs}" font-weight="800" fill="#FFFFFF">Y</text>
</svg>`;
}

for (const size of [192, 512]) {
  const out = join(outDir, `icon-${size}.png`);
  await sharp(Buffer.from(svg(size))).png({ compressionLevel: 9 }).toFile(out);
  console.log('wrote', out);
}
