import { resolve, basename, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Reliable application root directory.
 *
 * Why this exists: under IIS + iisnode the Node worker's `process.cwd()` is
 * `C:\Windows\System32\inetsrv` (no write permission), NOT the app folder.
 * Using `process.cwd()` for `uploads/` or the SQLite file path therefore
 * causes EACCES / file-not-found at startup and the process terminates
 * (iisnode 500.1002). We anchor to `__dirname` instead, which is stable.
 *
 * Compiled layout: this file becomes `<appRoot>/src/common/paths.js`
 *   - prod (deploy copies `dist/*` -> `D:\backend\`):  __dirname = D:\backend\src\common  -> ../../ = D:\backend  ✓
 *   - ts-node-dev (`start:dev`):                        __dirname = .../nestjs-backend/dist/src/common -> ../../ = nestjs-backend/dist  ✗ BUG
 *
 * Phase 402 (Voldi-fs) — dev'de ts-node-dev geçici dist klasörü kullanır;
 * dist içinde DB/uploads açmak yerine bir üst klasörü (project root) tercih
 * et. `dist` adlı klasörde bulunuyorsak ve bir üstte package.json varsa
 * o klasör asıl root'tur. iisnode prod yerleşiminde bu kontrol no-op.
 *
 * `APP_ROOT` env var, if set, wins — lets an operator pin the path explicitly.
 */
function resolveAppRoot(): string {
  if (process.env.APP_ROOT) return process.env.APP_ROOT;
  const dirUp = resolve(__dirname, '..', '..');
  if (basename(dirUp) === 'dist') {
    const parent = dirname(dirUp);
    if (existsSync(resolve(parent, 'package.json'))) {
      return parent;
    }
  }
  return dirUp;
}

export const APP_ROOT = resolveAppRoot();
