import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './common/sentry.filter';
import { APP_ROOT } from './common/paths';
import { isAbsolute } from 'path';
import sqlite3 from 'sqlite3';

// Inlined self-healing schema migration (was ./bootstrap/boot-migrations).
// Inlined into main.js so prod deploy doesn't require uploading a subfolder.
async function applyBootMigrations(): Promise<void> {
  const logger = new Logger('BootMigrations');
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (dbType !== 'sqlite') {
    logger.log(`non-sqlite DB (${dbType}), skipping boot migrations`);
    return;
  }
  const name =
    process.env.DB_DATABASE || process.env.DB_NAME || 'hizmet_db.sqlite';
  const dbPath =
    name === ':memory:' || isAbsolute(name) ? name : join(APP_ROOT, name);
  logger.log(`started — opening ${dbPath}`);

  const db: sqlite3.Database = await new Promise((resolve, reject) => {
    const handle = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(handle);
    });
  });
  const get = (sql: string, params: unknown[] = []): Promise<any> =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  const run = (sql: string): Promise<void> =>
    new Promise((resolve, reject) => {
      db.run(sql, (err) => (err ? reject(err) : resolve()));
    });

  try {
    for (const col of [
      { name: 'defaultIban', type: 'VARCHAR(34)' },
      { name: 'defaultAccountHolderName', type: 'VARCHAR(100)' },
    ]) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('users') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            logger.log(`added users.${col.name}`);
          } catch (e) {
            logger.warn(
              `add users.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect users.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    try {
      const tbl = await get(
        `SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='withdrawal_requests'`,
      );
      if (!tbl) {
        await run(
          `CREATE TABLE withdrawal_requests (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            workerId VARCHAR(36) NOT NULL,
            amountMinor INTEGER NOT NULL,
            iban VARCHAR(34) NOT NULL,
            accountHolderName VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','completed')),
            requestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processedAt DATETIME,
            processedBy VARCHAR(36),
            adminNote TEXT,
            workerNote TEXT
          )`,
        );
        await run(
          `CREATE INDEX idx_withdrawal_requests_worker_status ON withdrawal_requests(workerId, status)`,
        );
        await run(
          `CREATE INDEX idx_withdrawal_requests_status_requested ON withdrawal_requests(status, requestedAt)`,
        );
        logger.log('created withdrawal_requests + indexes');
      }
    } catch (e) {
      logger.warn(
        `withdrawal_requests setup skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    // Phase 253 — Mutual confirmation flow columns on payment_escrows.
    const escrowCols: { name: string; type: string }[] = [
      {
        name: 'confirmationStatus',
        type: "VARCHAR(32) NOT NULL DEFAULT 'none'",
      },
      { name: 'confirmationTier', type: 'VARCHAR(16)' },
      { name: 'qrToken', type: 'VARCHAR(64)' },
      { name: 'qrIssuedAt', type: 'DATETIME' },
      { name: 'qrScannedAt', type: 'DATETIME' },
      { name: 'workerLat', type: 'REAL' },
      { name: 'workerLng', type: 'REAL' },
      { name: 'customerLat', type: 'REAL' },
      { name: 'customerLng', type: 'REAL' },
      { name: 'workerConfirmedAt', type: 'DATETIME' },
      { name: 'customerConfirmedAt', type: 'DATETIME' },
      { name: 'confirmationDeadline', type: 'DATETIME' },
    ];
    for (const col of escrowCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('payment_escrows') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(
              `ALTER TABLE payment_escrows ADD COLUMN ${col.name} ${col.type}`,
            );
            logger.log(`added payment_escrows.${col.name}`);
          } catch (e) {
            logger.warn(
              `add payment_escrows.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect payment_escrows.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 253 — escrow_confirmation_photos
    try {
      const tbl = await get(
        `SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='escrow_confirmation_photos'`,
      );
      if (!tbl) {
        await run(
          `CREATE TABLE escrow_confirmation_photos (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            escrowId VARCHAR(36) NOT NULL,
            uploadedByUserId VARCHAR(36) NOT NULL,
            side VARCHAR(16) NOT NULL,
            phase VARCHAR(16) NOT NULL,
            photoUrl VARCHAR(255) NOT NULL,
            lat REAL,
            lng REAL,
            takenAt DATETIME,
            uploadedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
        );
        await run(
          `CREATE INDEX idx_escrow_confirm_photos_lookup ON escrow_confirmation_photos(escrowId, side, phase)`,
        );
        await run(
          `CREATE INDEX idx_escrow_confirm_photos_escrow ON escrow_confirmation_photos(escrowId)`,
        );
        logger.log('created escrow_confirmation_photos + indexes');
      }
    } catch (e) {
      logger.warn(
        `escrow_confirmation_photos setup skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Phase 253 — escrow_confirmation_videos
    try {
      const tbl = await get(
        `SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='escrow_confirmation_videos'`,
      );
      if (!tbl) {
        await run(
          `CREATE TABLE escrow_confirmation_videos (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            escrowId VARCHAR(36) NOT NULL,
            uploadedByUserId VARCHAR(36) NOT NULL,
            side VARCHAR(16) NOT NULL,
            videoUrl VARCHAR(255) NOT NULL,
            durationSec INTEGER,
            lat REAL,
            lng REAL,
            uploadedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
        );
        await run(
          `CREATE INDEX idx_escrow_confirm_videos_escrow ON escrow_confirmation_videos(escrowId)`,
        );
        logger.log('created escrow_confirmation_videos + index');
      }
    } catch (e) {
      logger.warn(
        `escrow_confirmation_videos setup skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Phase 257 — Mutual confirmation flow columns mirrored onto booking_escrows
    // so /escrow/:id/confirmation/* can bridge to BookingEscrow rows written by
    // /escrow/hold. Idempotent ADD COLUMN — safe to run on every boot.
    const bookingEscrowConfirmCols: { name: string; type: string }[] = [
      {
        name: 'confirmationStatus',
        type: "VARCHAR(32) NOT NULL DEFAULT 'none'",
      },
      { name: 'confirmationTier', type: 'VARCHAR(16)' },
      { name: 'qrToken', type: 'VARCHAR(64)' },
      { name: 'qrIssuedAt', type: 'DATETIME' },
      { name: 'qrScannedAt', type: 'DATETIME' },
      { name: 'workerLat', type: 'REAL' },
      { name: 'workerLng', type: 'REAL' },
      { name: 'customerLat', type: 'REAL' },
      { name: 'customerLng', type: 'REAL' },
      { name: 'workerConfirmedAt', type: 'DATETIME' },
      { name: 'customerConfirmedAt', type: 'DATETIME' },
      { name: 'confirmationDeadline', type: 'DATETIME' },
    ];
    for (const col of bookingEscrowConfirmCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('booking_escrows') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(
              `ALTER TABLE booking_escrows ADD COLUMN ${col.name} ${col.type}`,
            );
            logger.log(`added booking_escrows.${col.name}`);
          } catch (e) {
            logger.warn(
              `add booking_escrows.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect booking_escrows.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 254a — Platform commission split columns on booking_escrows.
    const bookingEscrowCommissionCols: { name: string; type: string }[] = [
      { name: 'platformFeeMinor', type: 'INTEGER' },
      { name: 'platformFeePct', type: 'REAL' },
      { name: 'workerPayoutMinor', type: 'INTEGER' },
    ];
    for (const col of bookingEscrowCommissionCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('booking_escrows') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(
              `ALTER TABLE booking_escrows ADD COLUMN ${col.name} ${col.type}`,
            );
            logger.log(`added booking_escrows.${col.name}`);
          } catch (e) {
            logger.warn(
              `add booking_escrows.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect booking_escrows.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 254a — platform_settings table + default QR commission row.
    try {
      const tbl = await get(
        `SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='platform_settings'`,
      );
      if (!tbl) {
        await run(
          `CREATE TABLE platform_settings (
            key VARCHAR(100) PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedBy VARCHAR(36)
          )`,
        );
        logger.log('created platform_settings');
      }
      // Idempotent default: only insert if missing.
      const existsRow = await get(
        `SELECT 1 AS found FROM platform_settings WHERE key = ?`,
        ['commission_pct_qr'],
      );
      if (!existsRow) {
        await run(
          `INSERT INTO platform_settings (key, value) VALUES ('commission_pct_qr', '1')`,
        );
        logger.log('seeded platform_settings.commission_pct_qr=1');
      }
    } catch (e) {
      logger.warn(
        `platform_settings setup skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Phase 182 — admin_audit_logs gained denormalized + request-context columns.
    const auditCols: { name: string; type: string }[] = [
      { name: 'tenantId', type: 'VARCHAR(36)' },
      { name: 'actorEmail', type: 'VARCHAR(255)' },
      { name: 'ip', type: 'VARCHAR(64)' },
      { name: 'userAgent', type: 'VARCHAR(512)' },
    ];
    for (const col of auditCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('admin_audit_logs') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(
              `ALTER TABLE admin_audit_logs ADD COLUMN ${col.name} ${col.type}`,
            );
            logger.log(`added admin_audit_logs.${col.name}`);
          } catch (e) {
            logger.warn(
              `add admin_audit_logs.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect admin_audit_logs.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 174c — Minor-unit (kuruş) columns added later than initial schema.
    // Idempotently ALTER each table to add the missing INTEGER column.
    const minorCols: { table: string; column: string }[] = [
      { table: 'token_transactions', column: 'amountMinor' },
      { table: 'offers', column: 'priceMinor' },
      { table: 'service_requests', column: 'priceMinor' },
      { table: 'payments', column: 'amountMinor' },
      { table: 'payment_escrows', column: 'amountMinor' },
      { table: 'booking_escrows', column: 'amountMinor' },
      { table: 'users', column: 'tokenBalanceMinor' },
      { table: 'bookings', column: 'agreedPriceMinor' },
    ];
    for (const { table, column } of minorCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info(?) WHERE name = ?`,
          [table, column],
        );
        if (!exists) {
          try {
            await run(
              `ALTER TABLE ${table} ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`,
            );
            logger.log(`added ${table}.${column}`);
          } catch (e) {
            logger.warn(
              `add ${table}.${column} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect ${table}.${column} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 174c backfill — rows that existed BEFORE the minor-unit column was
    // added got `0` from the ALTER DEFAULT. Translate the legacy decimal `amount`
    // / `price` columns into kuruş (×100, rounded) so the API stops returning
    // amountMinor=0/null while amount is populated. Idempotent: only touches
    // rows where the minor field is still 0 but the source field is positive.
    const backfills: { table: string; minor: string; source: string }[] = [
      { table: 'booking_escrows', minor: 'amountMinor', source: 'amount' },
      { table: 'payment_escrows', minor: 'amountMinor', source: 'amount' },
      { table: 'payments', minor: 'amountMinor', source: 'amount' },
      { table: 'offers', minor: 'priceMinor', source: 'price' },
      { table: 'service_requests', minor: 'priceMinor', source: 'price' },
      { table: 'bookings', minor: 'agreedPriceMinor', source: 'agreedPrice' },
      { table: 'token_transactions', minor: 'amountMinor', source: 'amount' },
      { table: 'users', minor: 'tokenBalanceMinor', source: 'tokenBalance' },
    ];
    for (const { table, minor, source } of backfills) {
      try {
        const hasMinor = await get(
          `SELECT 1 AS found FROM pragma_table_info(?) WHERE name = ?`,
          [table, minor],
        );
        const hasSource = await get(
          `SELECT 1 AS found FROM pragma_table_info(?) WHERE name = ?`,
          [table, source],
        );
        if (!hasMinor || !hasSource) continue;
        await run(
          `UPDATE ${table} SET ${minor} = CAST(ROUND(${source} * 100) AS INTEGER) WHERE (${minor} IS NULL OR ${minor} = 0) AND ${source} IS NOT NULL AND ${source} > 0`,
        );
        logger.log(`backfilled ${table}.${minor} from ${source}`);
      } catch (e) {
        logger.warn(
          `backfill ${table}.${minor} skipped: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // Phase 287/297 — offers.tokenCost (admin-controlled flat/percent cost
    // saklanır; withdraw refund tam bu miktarı iade eder). Prod synchronize=false
    // olduğundan entity değişiklikleri burada manuel ALTER ile eşitlenir.
    try {
      const exists = await get(
        `SELECT 1 AS found FROM pragma_table_info('offers') WHERE name = 'tokenCost'`,
      );
      if (!exists) {
        try {
          await run('ALTER TABLE offers ADD COLUMN tokenCost REAL');
          logger.log('added offers.tokenCost');
        } catch (e) {
          logger.warn(
            `add offers.tokenCost skipped: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    } catch (e) {
      logger.warn(
        `detect offers.tokenCost failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // Phase 507a — offers.counterCount (default 0). Entity'e eklendi (Faz 507a),
    // prod synchronize=false olduğundan eksik kolon → TypeORM `SELECT * FROM
    // offers` SQLITE_ERROR no such column → /jobs/:id/offers 500 dönüyordu.
    // Belt-and-suspenders: TypeORM migration var (Phase507AddOfferCounterCount),
    // burada da idempotent ALTER (migration zinciri kopsa bile boot-migration
    // tutar).
    try {
      const exists = await get(
        `SELECT 1 AS found FROM pragma_table_info('offers') WHERE name = 'counterCount'`,
      );
      if (!exists) {
        try {
          await run(
            'ALTER TABLE offers ADD COLUMN counterCount INTEGER NOT NULL DEFAULT 0',
          );
          logger.log('added offers.counterCount');
        } catch (e) {
          logger.warn(
            `add offers.counterCount skipped: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    } catch (e) {
      logger.warn(
        `detect offers.counterCount failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    logger.log('all up-to-date');
  } finally {
    await new Promise<void>((resolve) => db.close(() => resolve()));
  }
}

// Sentry — prod-only, env-driven. Phase 189/4: release tag + tighter sample rate.
const SENTRY_ENABLED =
  !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production';
if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,
    release: process.env.GIT_SHA || 'unknown',
  });
}

// Phase 178/189 — top-level crash visibility for iisnode logs + Sentry capture.
// Without these, an early throw produces opaque 500s with empty log files.
process.on('uncaughtException', (err) => {
  console.error(
    '[boot] uncaughtException:',
    err && err.stack ? err.stack : err,
  );
  if (SENTRY_ENABLED) {
    try {
      Sentry.captureException(err);
    } catch {
      /* never let Sentry crash the crash handler */
    }
  }
});
process.on('unhandledRejection', (reason) => {
  console.error('[boot] unhandledRejection:', reason);
  if (SENTRY_ENABLED) {
    try {
      Sentry.captureException(
        reason instanceof Error ? reason : new Error(String(reason)),
      );
    } catch {
      /* swallow */
    }
  }
});

async function bootstrap() {
  console.log(
    '[boot] starting NestJS, node=' + process.version + ' pid=' + process.pid,
  );
  // Self-healing schema migration MUST run before NestFactory.create() —
  // otherwise TypeORM crashes on missing columns/tables under `synchronize: false`.
  await applyBootMigrations();
  // Phase 520 — UTF-8 encoding fix.
  // body-parser v2 + Express 5 + iisnode quirk: clients/proxies that send
  // `Content-Type: application/json` (no `; charset=utf-8`) cause body-parser
  // to call raw-body with encoding=null → JSON.parse on a Buffer can mangle
  // multi-byte chars (Turkish İ/Ş/Ğ become EF BF BD replacement chars).
  // Fix: disable Nest's default body parser and re-mount express.json/urlencoded
  // with explicit `defaultCharset: 'utf-8'` so charset assumption is locked.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bodyParser = require('body-parser');
  // CRITICAL: read body as RAW Buffer (verify hook captures it), then we manually
  // decode UTF-8 ourselves. body-parser v2 + iconv-lite + iisnode kombinasyonunda
  // multi-byte char EF BF BD'ye düşüyor; Node.js native Buffer.toString('utf-8')
  // güvenilir.
  app.use(
    bodyParser.json({
      limit: '5mb',
      type: 'application/json',
      // verify çalışınca read.js encoding'i null'a düşürür → body Buffer kalır.
      // Sonra biz aşağıdaki middleware'de Buffer'ı utf-8 string'e çeviririz.
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBuffer = buf;
      },
    }),
  );
  // Phase 520 — ROOT CAUSE: Plesk Windows IIS+iisnode hostu Türkçe Windows-1254
  // code page kullanıyor. iisnode pipe'a yazılan HTTP request body bytes UTF-8'den
  // Windows-1254'e TRANSCODE EDİLİYOR (system default ANSI). Diagnostic: İstanbul
  // request bytes c4 b0 → DD (single byte Win1254 for İ). Bu yüzden body-parser
  // utf-8 olarak okuyunca DD invalid utf-8 → FFFD replacement.
  //
  // Çözüm: raw buffer'ı Windows-1254 olarak decode et, sonra JSON.parse.
  // iconv-lite Windows-1254 desteği var.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconv = require('iconv-lite');
  app.use((req: any, _res: any, next: any) => {
    try {
      // body-parser tarafından parse edilen object'i kullanma — raw buffer'dan
      // Win1254 decode ile yeniden parse et.
      if (Buffer.isBuffer(req.rawBuffer) && req.rawBuffer.length > 0) {
        const ctype = (req.headers['content-type'] || '').toLowerCase();
        if (ctype.includes('application/json')) {
          // Heuristic: önce UTF-8 dene; valid değilse Win1254 (Plesk transcode).
          let str: string;
          try {
            str = req.rawBuffer.toString('utf-8');
            // Eğer FFFD replacement char varsa UTF-8 decode başarısız → Win1254 dene
            if (str.includes('�')) {
              str = iconv.decode(req.rawBuffer, 'win1254');
            }
          } catch {
            str = iconv.decode(req.rawBuffer, 'win1254');
          }
          req.body = JSON.parse(str);
        }
      }
    } catch (e) {
      return next(e);
    }
    next();
  });
  // Phase 520 — UTF-8 diagnostic endpoint kaldırıldı (root cause Plesk Win1254
  // transcode bulundu, fix doğrulandı — bkz aşağıdaki Win1254 fallback middleware).
  app.use(
    bodyParser.urlencoded({
      limit: '5mb',
      extended: true,
      defaultCharset: 'utf-8',
    }),
  );
  console.log('[boot] body-parser mounted (utf-8 default)');
  console.log('[boot] Nest app created');
  app.useGlobalFilters(new SentryFilter());

  // P222 — SQLite production hardening: PRAGMA at boot (WAL + busy_timeout + FK + sync).
  // Without WAL, concurrent reader+writer SERIALIZE → 5s+ admin endpoint stalls under load.
  try {
    const dataSource = app.get(DataSource);
    const dbType = dataSource.options.type;
    if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      await dataSource.query('PRAGMA journal_mode = WAL');
      await dataSource.query('PRAGMA busy_timeout = 5000');
      await dataSource.query('PRAGMA foreign_keys = ON');
      await dataSource.query('PRAGMA synchronous = NORMAL');
      Logger.log(
        '[bootstrap] SQLite PRAGMA hardening applied (WAL + busy=5s + FK=on + sync=NORMAL)',
        'Bootstrap',
      );
    }
  } catch (e) {
    console.warn(
      '[boot] SQLite PRAGMA hardening failed (non-fatal):',
      e instanceof Error ? e.message : e,
    );
  }

  const isProd = process.env.NODE_ENV === 'production';

  // Phase 131/170/258/526 — Helmet: HTTP güvenlik header'ları
  // - HSTS: 1 yıl, alt domainler dahil, preload-ready (sadece TLS arkasında etkili)
  // - CSP: Iyzipay frame'i (env-gate: prod yalnız api.iyzipay, dev sandbox+api),
  //        Plausible/GTM analytics, self img/script/style, websocket connect
  // - referrerPolicy + frameguard (clickjacking) + nosniff (X-Content-Type-Options)
  // - X-DNS-Prefetch-Control: off (gizlilik — helmet default'u allow, off'a çekiyoruz)
  // - Permissions-Policy: camera/mic/geolocation/payment minimal yetki
  // crossOriginResourcePolicy 'cross-origin': /uploads görselleri Flutter uygulamasından
  //   ve farklı origin'lerden yüklenebilsin (CORP başlığı görseli bloke etmesin).
  //
  // Phase 526 — `'unsafe-inline'` DROP (script-src). Backend bir JSON API, hiçbir
  //   response inline <script> içermiyor. Swagger UI (/api/docs) zaten CSP'den
  //   muaf (skipDocsCsp). Bu sayede Phase 519 XSS sanitize'ın bypass yolu kapanır.
  //   Style-src 'unsafe-inline' korunur (Swagger CSS inline expects, ileride nonce'lanır).
  //
  // CSP Swagger notu: Swagger UI (/api/docs, dev-only) kendi bundle JS/CSS'ini ve
  //   inline style/script + blob worker kullanır. Bu yüzden:
  //   - Strict CSP'yi /api/docs path'ine UYGULAMIYORUZ (aşağıdaki skipDocsCsp guard'ı).
  //   - Genel CSP yine de scriptSrc'a 'blob:' ve worker-src 'blob:' ekler ki
  //     Swagger dışı sayfalar da CSP altında çalışsın, JSON API zaten HTML render etmez.
  //   Bu, JSON API + statik /uploads görselleri kırmadan makul-permissive bir politikadır.

  // Iyzipay frame allowlist — prod sadece live, dev sandbox + live.
  const iyziFrameSrc = isProd
    ? ['https://api.iyzipay.com']
    : ['https://sandbox-api.iyzipay.com', 'https://api.iyzipay.com'];

  const cspMiddleware = helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      // Phase 526 — drop 'unsafe-inline'. JSON API'da inline script yok.
      scriptSrc: [
        "'self'",
        'blob:',
        'https://www.googletagmanager.com',
        'https://plausible.io',
      ],
      // Swagger UI service worker / blob worker'ları için
      workerSrc: ["'self'", 'blob:'],
      connectSrc: [
        "'self'",
        'https://yapgitsin.tr',
        'wss://yapgitsin.tr',
        'https://plausible.io',
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'", ...iyziFrameSrc],
      // upgrade-insecure-requests prod TLS uyumu
      upgradeInsecureRequests: isProd ? [] : null,
    },
  });

  app.use(
    helmet({
      // CSP'yi helmet ana çağrısından ayrı yönetiyoruz (Swagger path skip için).
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'sameorigin' }, // X-Frame-Options: SAMEORIGIN
      dnsPrefetchControl: { allow: false }, // X-DNS-Prefetch-Control: off
    }),
  );

  // CSP'yi /api/docs (Swagger UI) HARİÇ tüm route'lara uygula. Swagger UI
  //   strict CSP altında bozulur (inline/blob script), dev-only olduğu için
  //   bu path'i CSP'den muaf tutmak güvenlik açısından kabul edilebilir.
  app.use((req: any, res: any, next: any) => {
    const url: string = req.originalUrl || req.url || '';
    if (url.startsWith('/api/docs')) return next();
    return cspMiddleware(req, res, next);
  });

  // Phase 526 — Permissions-Policy: kameraya/mic'e/coğrafi konuma minimum yetki.
  // - camera=(self): escrow confirmation photo akışı (mobil web fallback) için self
  // - microphone=(): hiçbir feature mic istemiyor → boş allowlist
  // - geolocation=(self): worker availability / nearby jobs harita feature'ı
  // - payment=(self): Payment Request API (Iyzipay redirect olduğu için self yeterli)
  // Helmet'in built-in permittedCrossDomainPolicies header'ı kapsamı dar, bu yüzden
  // doğrudan setHeader. Tüm route'lara uygulanır, /api/docs dahil (güvenlik).
  app.use((_req: any, res: any, next: any) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(), geolocation=(self), payment=(self)',
    );
    next();
  });
  console.log('[boot] helmet ready (CSP strict + Permissions-Policy)');

  // Global validation — tüm DTO dekoratörleri (class-validator) aktif hale gelir
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan alanları sil
      forbidNonWhitelisted: true, // bilinmeyen alan gelirse 400 döndür (güvenlik)
      transform: true, // string → number dönüşümlerini otomatik yap
    }),
  );

  // Phase 216 — Global ClassSerializerInterceptor: @Exclude() entity field'larını
  // response'dan otomatik çıkarır (passwordHash, fcmTokens vb.)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger / OpenAPI dökümantasyonu — /api/docs adresinde (dev-only)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Yapgitsin API')
      .setDescription(
        'Yapgitsin v2 — Türkiye hizmet marketplace platformu REST API dökümantasyonu.\n\n' +
          '**Auth:** JWT Bearer token ile kimlik doğrulama.\n\n' +
          '**Test kullanıcıları:** fatma@test.com / mehmet@test.com (şifre: Test1234)',
      )
      .setVersion('2.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addTag('Auth', 'Kimlik doğrulama — login, register, admin login')
      .addTag('Users', 'Kullanıcı profili ve usta dizini')
      .addTag('Jobs', 'İş ilanları ve teklifler')
      .addTag('Service Requests', 'Hizmet talepleri ve başvurular')
      .addTag('Bookings', 'Randevu yönetimi')
      .addTag('Reviews', 'Değerlendirme ve puanlama')
      .addTag('Categories', 'Hizmet kategorileri')
      .addTag('Tokens', 'Kredi bakiyesi ve satın alma')
      .addTag('Notifications', 'Bildirim yönetimi')
      .addTag('Uploads', 'Dosya yükleme (fotoğraf)')
      .addTag('AI', 'Yapay zeka özellikleri')
      .addTag('Admin', 'Admin panel yönetimi')
      .addTag('Chat', 'WebSocket sohbet')
      .addTag('Payments', 'İyzipay ödeme entegrasyonu')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Yapgitsin API Docs',
      customCss: '.swagger-ui .topbar { background-color: #007DFE; }',
    });
  }

  // CORS — Phase 170 hardening:
  //   - Production'da http:// ve localhost reject (boot fail)
  //   - Origin function: dev tüm localhost serbest, prod strict allowlist
  //   - Native (Capacitor / mobil) için origin=null/undefined kabul
  const rawOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
  const NATIVE_APP_SCHEMES = [
    'capacitor://',
    'ionic://',
    'ms-appx://',
    'ms-appx-web://',
    'file://',
  ];
  const isNativeAppScheme = (o: string) =>
    NATIVE_APP_SCHEMES.some((s) => o.startsWith(s));
  if (isProd) {
    // BOOT-time fast-fail on misconfig (these THROWs are intentional — before app.listen)
    if (rawOrigins.length === 0) {
      throw new Error(
        'Production requires ALLOWED_ORIGINS env (comma-separated list)',
      );
    }
    const bad = rawOrigins.find(
      (o) =>
        !isNativeAppScheme(o) &&
        (o === '*' ||
          o.startsWith('http://') ||
          /localhost|127\.0\.0\.1/.test(o)),
    );
    if (bad) {
      throw new Error(
        `Production ALLOWED_ORIGINS rejects "${bad}" (no *, http://, plain localhost, plain 127.0.0.1 — capacitor:// vb. native scheme'ler izinli)`,
      );
    }
  }
  // Boot-time visibility: log resolved allowlist so env changes are debuggable.
  console.log(
    `[boot] CORS allowlist (prod=${isProd}): [${rawOrigins.join(', ')}] + native(${NATIVE_APP_SCHEMES.join(',')})`,
  );
  // Per-request origin check — MUST NEVER THROW (throw → 500 on OPTIONS preflight).
  // Disallowed origin: cb(null, false) → Nest sends clean response without ACAO header,
  // browser blocks on its end. No exception propagates into the request pipeline.
  const originFn = (
    origin: string | undefined,
    cb: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Native (Capacitor/mobile/curl/server-to-server/file://) — origin yok
    if (!origin) return cb(null, true);
    if (!isProd) {
      // dev: localhost / 127.0.0.1 / capacitor / file her zaman serbest
      if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin))
        return cb(null, true);
      if (/^capacitor:\/\//.test(origin)) return cb(null, true);
      if (rawOrigins.length === 0) return cb(null, true);
    }
    if (rawOrigins.includes(origin)) return cb(null, true);
    if (isNativeAppScheme(origin)) return cb(null, true);
    // Disallowed — DO NOT throw. Clean rejection, no ACAO header.
    return cb(null, false);
  };
  // Phase 192/1 — OPTIONS preflight fix:
  //   - allowedHeaders: Authorization + content-type + custom headers açık (preflight header match)
  //   - exposedHeaders: admin panel'in okuduğu pagination headers
  //   - preflightContinue: false → Express OPTIONS'ı NestJS pipeline'a taşımaz, 204 döner
  //   - optionsSuccessStatus: 204 → bazı eski browser'lar 200 yerine 204 bekler
  app.enableCors({
    origin: originFn,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Authorization,Content-Type,Accept,X-Requested-With,sentry-trace,baggage',
    exposedHeaders: 'X-Total-Count,Content-Range',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.useWebSocketAdapter(new IoAdapter(app.getHttpServer()));

  // Cloudflare / reverse-proxy arkasında req.protocol = 'https' olsun.
  app.set('trust proxy', 1);

  // Phase 530 (Voldi-ops) — DISABLE Express auto-ETag globally.
  // Backend bir JSON API; ETag/304 mekanizması neredeyse hiç fayda sağlamıyor
  // (her response dinamik, user-scoped). Asıl problem: /health ve /healthz
  // üzerinde ETag dönünce Cloudflare/proxy cache layer'ları "fresh" varsayıp
  // backend ölmüş olsa bile stale 200 OK + "status: ok" dönebiliyor →
  // uptime monitor backend ölümünü kaçırır.
  // @Header('Cache-Control', 'no-store') tek başına ETag generation'ı durdurmaz;
  // bu yüzden Express seviyesinde kapat.
  app.set('etag', false);

  // uploads/jobs klasörünü oluştur (yoksa).
  // APP_ROOT kullan — iisnode altında process.cwd() = C:\Windows\System32\inetsrv (yazma izni yok).
  // mkdir başarısız olsa bile app crash etmemeli: uploads özelliği devre dışı kalır, API ayakta kalır.
  const uploadsDir = join(APP_ROOT, 'uploads', 'jobs');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (e) {
    console.warn(
      '[boot] uploads dir create failed (uploads will be unavailable):',
      e instanceof Error ? e.message : e,
    );
  }

  // /uploads/* → uploads/ klasöründen statik dosya sun
  app.useStaticAssets(join(APP_ROOT, 'uploads'), { prefix: '/uploads' });

  // IIS reverse-proxy mount path (e.g. /backend → NestJS routes prefixed with /backend)
  const globalPrefix = process.env.GLOBAL_PREFIX;
  if (globalPrefix) app.setGlobalPrefix(globalPrefix, { exclude: ['health'] });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[boot] listening on port ${port} pid ${process.pid}`);
  console.log(`🚀 Yapgitsin API: http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
void bootstrap().catch((err) => {
  console.error('[boot] bootstrap failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
