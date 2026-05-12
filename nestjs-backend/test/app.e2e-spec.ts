import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // Phase 170 — cache katmanı: Redis olmadan in-memory fallback ile çalışmalı.
  // Aynı endpoint'i iki kez çağır; ikincisi cache'ten gelse de aynı yanıt + 200 olmalı.
  it('GET /stats/public — cache fallback (Redis yokken patlamamalı, idempotent)', async () => {
    const first = await request(app.getHttpServer()).get('/stats/public').expect(200);
    const second = await request(app.getHttpServer()).get('/stats/public').expect(200);
    expect(typeof first.body.totalUsers).toBe('number');
    expect(second.body.totalUsers).toBe(first.body.totalUsers);
    expect(second.body.totalJobs).toBe(first.body.totalJobs);
  });

  afterEach(async () => {
    await app.close();
  });
});
