import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 183 — KVKK / GDPR user data export (e2e).
 *
 *   A. Unauthenticated → 401.
 *   B. Authed → 200, application/json, Content-Disposition attachment header,
 *      response shape contains exportedAt, userId, fields.profile.email, meta.counts.
 *   C. passwordHash MUST NOT appear anywhere in the response body.
 *   D. Throttle: 3 calls / min → 4th call → 429.
 *
 * NOTE: the global UserOrIpThrottlerGuard falls back to IP-keying because it
 * runs before AuthGuard populates req.user. All tests share the same IP, so
 * the throttle test (D) runs first to claim the 3-call budget cleanly.
 */
describe('User data export (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const userEmail = 'data-export-user@test.com';

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: userEmail,
        phoneNumber: '5559991183',
        password: 'Test1234',
        fullName: 'Data Export User',
      })
      .expect(201);
    token = reg.body.access_token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('A. rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .get('/users/me/data-export.json')
      .expect(401);
  });

  it('D. throttles after 3 calls within 1 minute with 429', async () => {
    // Test A consumed 1 call from the IP bucket (the 401 still counts).
    // Budget remaining: 2. We make 2 successful calls then expect 429.
    await request(app.getHttpServer())
      .get('/users/me/data-export.json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/me/data-export.json')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/me/data-export.json')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);
  });

  it('B. returns JSON with correct headers and shape (after throttle reset)', async () => {
    // After the throttle hit above, wait for ttl window before next attempts.
    // We can't actually wait 60s in a test, so we reach into the throttler storage
    // by re-using a freshly registered user (still same IP bucket though).
    // Strategy: parse cached body from a prior successful call would be cleaner;
    // instead we inspect the response from D's first successful call indirectly
    // by issuing one more call after a tiny stagger — best effort.
    //
    // Practical workaround: re-init the app to clear the in-memory throttler.
    await app.close();
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'data-export-user2@test.com',
        phoneNumber: '5559991283',
        password: 'Test1234',
        fullName: 'Data Export User 2',
      })
      .expect(201);
    const t = reg.body.access_token;

    const res = await request(app.getHttpServer())
      .get('/users/me/data-export.json')
      .set('Authorization', `Bearer ${t}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(
      /yapgitsin-data-export-.*\.json/,
    );
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty(
      'fields.profile.email',
      'data-export-user2@test.com',
    );
    expect(res.body).toHaveProperty('meta.counts');
    expect(typeof res.body.meta.counts.bookings).toBe('number');
    expect(res.body.meta.truncated).toHaveProperty('chatMessages');
    expect(res.body.meta.truncated).toHaveProperty('notifications');

    // C — same call payload must not contain sensitive keys.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/passwordHash/);
    expect(raw).not.toMatch(/twoFactorSecret/);
  });
});
