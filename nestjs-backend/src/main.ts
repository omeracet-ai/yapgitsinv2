import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new SentryFilter());

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

  // CORS: production'da ALLOWED_ORIGINS env değişkeni ile kısıtla
  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  if (isProd) {
    if (rawOrigins.length === 0) {
      throw new Error('Production requires ALLOWED_ORIGINS env (comma-separated list)');
    }
    const bad = rawOrigins.find((o) => o === '*' || /localhost|127\.0\.0\.1/.test(o));
    if (bad) {
      throw new Error(`Production ALLOWED_ORIGINS rejects "${bad}" (no *, localhost, 127.0.0.1)`);
    }
  }
  const allowedOrigins = rawOrigins.length > 0 ? rawOrigins : true; // dev: tüm originler
  app.enableCors({
    origin: allowedOrigins,
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
  console.log(`🚀 Yapgitsin API: http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
