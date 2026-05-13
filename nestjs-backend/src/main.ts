import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './common/sentry.filter';
import { APP_ROOT } from './common/paths';

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log('[boot] Nest app created');
  app.useGlobalFilters(new SentryFilter());

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

  // Global validation — tüm DTO dekoratörleri (class-validator) aktif hale gelir
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan alanları sil
      forbidNonWhitelisted: false, // bilinmeyen alan gelirse hata yerine sessizce sil
      transform: true, // string → number dönüşümlerini otomatik yap
    }),
  );

  // Swagger / OpenAPI dökümantasyonu — /api/docs adresinde
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

  // CORS — Phase 170 hardening:
  //   - Production'da http:// ve localhost reject (boot fail)
  //   - Origin function: dev tüm localhost serbest, prod strict allowlist
  //   - Native (Capacitor / mobil) için origin=null/undefined kabul
  const isProd = process.env.NODE_ENV === 'production';
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
  app.enableCors({
    origin: originFn,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app.getHttpServer()));

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
