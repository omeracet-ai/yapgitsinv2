import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
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
  const name = process.env.DB_DATABASE || process.env.DB_NAME || 'hizmet_db.sqlite';
  const dbPath = name === ':memory:' || isAbsolute(name) ? name : join(APP_ROOT, name);
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
            logger.warn(`add users.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        logger.warn(`detect users.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`);
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
        await run(`CREATE INDEX idx_withdrawal_requests_worker_status ON withdrawal_requests(workerId, status)`);
        await run(`CREATE INDEX idx_withdrawal_requests_status_requested ON withdrawal_requests(status, requestedAt)`);
        logger.log('created withdrawal_requests + indexes');
      }
    } catch (e) {
      logger.warn(`withdrawal_requests setup skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Phase 253 — Mutual confirmation flow columns on payment_escrows.
    const escrowCols: { name: string; type: string }[] = [
      { name: 'confirmationStatus', type: "VARCHAR(32) NOT NULL DEFAULT 'none'" },
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
  // eslint-disable-next-line no-console
  console.error('[boot] uncaughtException:', err && err.stack ? err.stack : err);
  if (SENTRY_ENABLED) {
    try {
      Sentry.captureException(err);
    } catch {
      /* never let Sentry crash the crash handler */
    }
  }
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[boot] unhandledRejection:', reason);
  if (SENTRY_ENABLED) {
    try {
      Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
    } catch {
      /* swallow */
    }
  }
});

async function bootstrap() {
  console.log('[boot] starting NestJS, node=' + process.version + ' pid=' + process.pid);
  // Self-healing schema migration MUST run before NestFactory.create() —
  // otherwise TypeORM crashes on missing columns/tables under `synchronize: false`.
  await applyBootMigrations();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
      Logger.log('[bootstrap] SQLite PRAGMA hardening applied (WAL + busy=5s + FK=on + sync=NORMAL)', 'Bootstrap');
    }
  } catch (e) {
    console.warn('[boot] SQLite PRAGMA hardening failed (non-fatal):', e instanceof Error ? e.message : e);
  }

  // Phase 131/170 — Helmet: HTTP güvenlik header'ları
  // - HSTS: 1 yıl, alt domainler dahil, preload-ready
  // - CSP: Iyzipay frame'i, Plausible/GTM analytics, self img/script/style, websocket connect
  // - referrerPolicy + frameguard (clickjacking) + nosniff
  // crossOriginResourcePolicy gevşetildi: /uploads farklı originden çekilebilsin
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'sameorigin' }, // X-Frame-Options: SAMEORIGIN
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://www.googletagmanager.com',
            'https://plausible.io',
          ],
          connectSrc: [
            "'self'",
            'https://yapgitsin.tr',
            'wss://yapgitsin.tr',
            'https://plausible.io',
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          frameSrc: [
            "'self'",
            'https://sandbox-api.iyzipay.com',
            'https://api.iyzipay.com',
          ],
          // upgrade-insecure-requests prod TLS uyumu
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  console.log('[boot] helmet ready');

  const isProd = process.env.NODE_ENV === 'production';

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
      .addTag('Tokens', 'Token bakiyesi ve satın alma')
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
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  const NATIVE_APP_SCHEMES = ['capacitor://', 'ionic://', 'ms-appx://', 'ms-appx-web://', 'file://'];
  const isNativeAppScheme = (o: string) => NATIVE_APP_SCHEMES.some((s) => o.startsWith(s));
  if (isProd) {
    // BOOT-time fast-fail on misconfig (these THROWs are intentional — before app.listen)
    if (rawOrigins.length === 0) {
      throw new Error('Production requires ALLOWED_ORIGINS env (comma-separated list)');
    }
    const bad = rawOrigins.find(
      (o) =>
        !isNativeAppScheme(o) &&
        (o === '*' || o.startsWith('http://') || /localhost|127\.0\.0\.1/.test(o)),
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
      if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return cb(null, true);
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
    allowedHeaders: 'Authorization,Content-Type,Accept,X-Requested-With,sentry-trace,baggage',
    exposedHeaders: 'X-Total-Count,Content-Range',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.useWebSocketAdapter(new IoAdapter(app.getHttpServer()));

  // Cloudflare / reverse-proxy arkasında req.protocol = 'https' olsun.
  app.set('trust proxy', 1);

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
  // eslint-disable-next-line no-console
  console.error('[boot] bootstrap failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
