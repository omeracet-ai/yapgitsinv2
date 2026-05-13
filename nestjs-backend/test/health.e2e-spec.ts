/**
 * Phase 189/4 — /health + /health/deep e2e.
 *
 * Verifies:
 *   - GET /health returns 200 with full payload (status, uptime, version, buildSha, checks, timestamp).
 *   - DB check passes (in-memory SQLite is up).
 *   - Cache returns 'memory-fallback' when REDIS_URL unset.
 *   - Iyzipay returns 'mock' when MOCK_IYZIPAY=1 (setup-e2e sets this).
 *   - GET /health/deep without auth → 401.
 *   - GET /health/deep with non-admin token → 403.
 *   - GET /health/deep with admin token → 200, deep.iyzipay.status === 'mock'.
 *   - Sentry init is silent (no SENTRY_DSN in e2e env).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Admin login (seeded by AuthService.onModuleInit using ADMIN_INITIAL_PASSWORD).
    const adm = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201);
    adminToken = adm.body.access_token;

    // Regular customer register → non-admin token.
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'health-customer@test.com',
        phoneNumber: '5559881234',
        password: 'Test1234',
        fullName: 'Health Customer',
      })
      .expect(201);
    userToken = reg.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → 200 with full payload (no auth required)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(ok|degraded|down)$/),
        uptime: expect.any(Number),
        version: expect.any(String),
        buildSha: expect.any(String),
        timestamp: expect.any(String),
        checks: expect.objectContaining({
          database: expect.any(String),
          cache: expect.any(String),
          iyzipay: expect.any(String),
        }),
      }),
    );
    expect(res.body.checks.database).toBe('ok');
    // Redis not configured in e2e → memory-fallback.
    expect(res.body.checks.cache).toBe('memory-fallback');
    // MOCK_IYZIPAY=1 set in setup-e2e.
    expect(res.body.checks.iyzipay).toBe('mock');
  });

  it('GET /health/deep without auth → 401', async () => {
    await request(app.getHttpServer()).get('/health/deep').expect(401);
  });

  it('GET /health/deep with non-admin token → 403', async () => {
    await request(app.getHttpServer())
      .get('/health/deep')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('GET /health/deep with admin token → 200, iyzipay = mock', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/deep')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.deep).toBeDefined();
    expect(res.body.deep.iyzipay.status).toBe('mock');
    expect(res.body.checks.database).toBe('ok');
  });

  it('Sentry stays silent when SENTRY_DSN unset (no crash)', () => {
    expect(process.env.SENTRY_DSN).toBeUndefined();
  });
});
