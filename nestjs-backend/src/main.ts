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

// Sentry — prod-only, env-driven
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Phase 178 — top-level crash visibility for iisnode logs.
// Without these, an early throw produces opaque 500s with empty log files.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[boot] uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[boot] unhandledRejection:', reason);
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
  if (isProd) {
    if (rawOrigins.length === 0) {
      throw new Error('Production requires ALLOWED_ORIGINS env (comma-separated list)');
    }
    const bad = rawOrigins.find(
      (o) => o === '*' || o.startsWith('http://') || /localhost|127\.0\.0\.1/.test(o),
    );
    if (bad) {
      throw new Error(
        `Production ALLOWED_ORIGINS rejects "${bad}" (no *, http://, localhost, 127.0.0.1)`,
      );
    }
  }
  const originFn = (
    origin: string | undefined,
    cb: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Native (Capacitor/mobile/curl) — origin yok
    if (!origin) return cb(null, true);
    if (!isProd) {
      // dev: localhost / 127.0.0.1 / capacitor / file her zaman serbest
      if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return cb(null, true);
      if (/^capacitor:\/\//.test(origin)) return cb(null, true);
      if (rawOrigins.length === 0) return cb(null, true);
    }
    if (rawOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin "${origin}" not allowed`), false);
  };
  app.enableCors({
    origin: originFn,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app.getHttpServer()));

  // uploads/jobs klasörünü oluştur (yoksa)
  const uploadsDir = join(process.cwd(), 'uploads', 'jobs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // /uploads/* → uploads/ klasöründen statik dosya sun
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

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
