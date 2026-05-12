import { resolve } from 'path';

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
 *   - ts-node dev (`start:dev`):                        __dirname = .../nestjs-backend/src/common -> ../../ = nestjs-backend ✓
 *
 * `APP_ROOT` env var, if set, wins — lets an operator pin the path explicitly.
 */
export const APP_ROOT = process.env.APP_ROOT || resolve(__dirname, '..', '..');
