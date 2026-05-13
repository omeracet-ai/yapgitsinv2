import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase P188/4 (Voldi-sec) — Refresh token rotation e2e.
 *
 * Flow:
 *   1. Register → receive access_token + refresh_token.
 *   2. POST /auth/refresh with refresh_token → new pair.
 *   3. Call /users/me with NEW access token → 200.
 *   4. Reuse OLD refresh_token → 401 (rotated).
 */
describe('Auth refresh (e2e)', () => {
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

  it('login → refresh → protected access → reuse old refresh fails', async () => {
    const email = `refresh_${Date.now()}@test.com`;
    const phone = '5559998877';
    const password = 'Test1234';

    const reg = await http()
      .post('/auth/register')
      .send({ email, phoneNumber: phone, password, fullName: 'Refresh Tester' })
      .expect(201);

    expect(reg.body.access_token).toBeDefined();
    expect(reg.body.refresh_token).toBeDefined();
    const oldRefresh = reg.body.refresh_token as string;

    // 1. Refresh → new pair.
    const r1 = await http()
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(201);
    expect(r1.body.accessToken).toBeDefined();
    expect(r1.body.refreshToken).toBeDefined();
    expect(r1.body.refreshToken).not.toBe(oldRefresh);

    // 2. New access token works on a protected route.
    await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${r1.body.accessToken}`)
      .expect(200);

    // 3. Reusing the OLD refresh token must fail (tokenVersion rotated).
    await http()
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);

    // 4. The new refresh token should still work once.
    const r2 = await http()
      .post('/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken })
      .expect(201);
    expect(r2.body.accessToken).toBeDefined();
    expect(r2.body.refreshToken).toBeDefined();
  });

  it('rejects an invalid / malformed refresh token with 401', async () => {
    // Use a distinct X-Forwarded-For so we don't share the IP throttle bucket
    // with the previous test (refresh route is 10/min per IP).
    await http()
      .post('/auth/refresh')
      .set('X-Forwarded-For', '10.99.0.1')
      .send({ refreshToken: 'not-a-real-jwt' })
      .expect(401);
    await http()
      .post('/auth/refresh')
      .set('X-Forwarded-For', '10.99.0.2')
      .send({})
      .expect(401);
  });
});
