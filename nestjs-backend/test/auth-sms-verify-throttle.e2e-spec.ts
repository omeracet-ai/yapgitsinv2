/**
 * Phase 230 (Voldi-sec) — POST /auth/sms/verify throttle e2e.
 *
 * Tests the route-level `@Throttle({ 'auth-login': { limit: 5, ttl: 15min } })`
 * override added to verifySmsOtp. OTP brute-force mitigation: with the previous
 * generic 600/dk tier, a 6-digit OTP space (1M combos) could be exhausted
 * within a single OTP's 5-min TTL (~6k tries). 5/15dk hard-caps that vector at
 * the IP boundary, on top of the existing DB-level attempt counter (5/OTP).
 *
 * Strategy:
 *   - Use a dedicated RFC5737 IP per-test to isolate the bucket
 *   - Send phoneNumber+code body — service returns 400 ("Kod bulunamadı") for
 *     non-existent OTPs, which is fine: we only assert HTTP throttle behavior
 *   - 5 requests must be < 429 (bucket capacity), 6th must be exactly 429
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('POST /auth/sms/verify throttle (e2e — Phase 230)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('1. honors auth-login override: 5/15min per IP → 6th request 429', async () => {
    const ip = `192.0.2.${(Date.now() % 250) + 1}`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await http()
        .post('/auth/sms/verify')
        .set('X-Forwarded-For', ip)
        .send({ phoneNumber: '05551234567', code: '000000' });
      statuses.push(r.status);
    }
    // First 5 must not be 429 (typically 400 "Kod bulunamadı")
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    // 6th crosses the cap → exact 429
    expect(statuses[5]).toBe(429);
  });

  it('2. different IPs have independent buckets', async () => {
    // Two distinct IPs each send 5 requests; none should be 429.
    const ipA = `198.51.100.${(Date.now() % 250) + 1}`;
    const ipB = `203.0.113.${((Date.now() + 1) % 250) + 1}`;
    const all: number[] = [];
    for (let i = 0; i < 5; i++) {
      const a = await http()
        .post('/auth/sms/verify')
        .set('X-Forwarded-For', ipA)
        .send({ phoneNumber: '05551112233', code: '111111' });
      const b = await http()
        .post('/auth/sms/verify')
        .set('X-Forwarded-For', ipB)
        .send({ phoneNumber: '05554445566', code: '222222' });
      all.push(a.status, b.status);
    }
    expect(all.every((s) => s !== 429)).toBe(true);
  });
});
