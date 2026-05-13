import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase P191/4 (Voldi-sec) — Logout token revocation e2e.
 *
 * POST /auth/logout bumps tokenVersion, which must:
 *   1. Invalidate the access token used to call logout itself (next request 401).
 *   2. Invalidate the refresh token paired with that session (refresh → 401).
 *   3. Return 204 No Content on success.
 *   4. Reject unauthenticated callers (no Bearer → 401).
 */
describe('Auth logout (e2e)', () => {
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

  it('login → protected route 200 → logout 204', async () => {
    const email = `logout1_${Date.now()}@test.com`;
    const phone = `555111${String(Date.now()).slice(-4)}`;
    const password = 'Test1234';

    const reg = await http()
      .post('/auth/register')
      .send({ email, phoneNumber: phone, password, fullName: 'Logout Tester' })
      .expect(201);

    const access = reg.body.access_token as string;
    expect(access).toBeDefined();

    // Protected route works before logout.
    await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);

    // Logout returns 204.
    await http()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .expect(204);
  });

  it('access token from before logout is rejected after logout (401)', async () => {
    const email = `logout2_${Date.now()}@test.com`;
    const phone = `555222${String(Date.now()).slice(-4)}`;
    const password = 'Test1234';

    const reg = await http()
      .post('/auth/register')
      .send({ email, phoneNumber: phone, password, fullName: 'Logout Tester 2' })
      .expect(201);

    const access = reg.body.access_token as string;

    await http()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .expect(204);

    // Same token must now be rejected.
    await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${access}`)
      .expect(401);
  });

  it('refresh token from before logout is rejected (tokenVersion bumped)', async () => {
    const email = `logout3_${Date.now()}@test.com`;
    const phone = `555333${String(Date.now()).slice(-4)}`;
    const password = 'Test1234';

    const reg = await http()
      .post('/auth/register')
      .send({ email, phoneNumber: phone, password, fullName: 'Logout Tester 3' })
      .expect(201);

    const access = reg.body.access_token as string;
    const refresh = reg.body.refresh_token as string;
    expect(refresh).toBeDefined();

    await http()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .expect(204);

    // Refresh token from the killed session must fail.
    await http()
      .post('/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });

  it('rejects logout without a Bearer token (401)', async () => {
    // Distinct X-Forwarded-For so we don't share a throttle bucket with earlier tests.
    await http()
      .post('/auth/logout')
      .set('X-Forwarded-For', '10.77.0.99')
      .expect(401);
  });
});
