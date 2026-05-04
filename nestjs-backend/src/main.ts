import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation — tüm DTO dekoratörleri (class-validator) aktif hale gelir
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan alanları sil
      forbidNonWhitelisted: false, // bilinmeyen alan gelirse hata yerine sessizce sil
      transform: true, // string → number dönüşümlerini otomatik yap
    }),
  );

  // CORS: production'da ALLOWED_ORIGINS env değişkeni ile kısıtla
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : true; // dev ortamında tüm originlere izin ver
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

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
