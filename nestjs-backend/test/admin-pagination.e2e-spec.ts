import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * P191/4 — Admin list pagination (e2e).
 *
 * Verifies that GET /admin/users, /admin/providers, /admin/jobs accept
 * `?page=&limit=` and return the standard {items,total,page,limit,totalPages}
 * shape, with totalPages correctly computed.
 *
 * Back-compat: calling each endpoint with NO paging params still returns
 * the legacy array shape so the dashboard widget keeps working.
 */
describe('Admin list pagination (e2e)', () => {
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

  // Per-request IP rotation to dodge auth-login throttler.
  let ipCounter = 0;
  const nextIp = () =>
    `10.91.${Math.floor(ipCounter / 256) % 256}.${(ipCounter++) % 256}`;

  let adminToken: string;
  it('admin login', async () => {
    const adm = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .set('X-Forwarded-For', nextIp())
      .send({ username: 'admin', password: 'admin' })
      .expect(201);
    adminToken = adm.body.access_token;
    expect(adminToken).toBeDefined();
  });

  const expectPaged = (body: unknown, expectedLimit: number) => {
    expect(body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expectedLimit,
        totalPages: expect.any(Number),
      }),
    );
    const p = body as {
      items: unknown[]; total: number; limit: number; totalPages: number;
    };
    expect(p.items.length).toBeLessThanOrEqual(p.limit);
    // totalPages = ceil(total / limit), with floor of 1
    const expectedPages = Math.max(1, Math.ceil(p.total / p.limit));
    expect(p.totalPages).toBe(expectedPages);
  };

  it('GET /admin/users?page=1&limit=5 → paginated shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200);
    expectPaged(res.body, 5);
  });

  it('GET /admin/users (no params) → legacy array', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /admin/providers?page=1&limit=5 → paginated shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/providers?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200);
    expectPaged(res.body, 5);
  });

  it('GET /admin/jobs?page=1&limit=5 → paginated shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/jobs?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200);
    expectPaged(res.body, 5);
  });

  it('rejects limit > 100', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=500')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(400);
  });

  it('rejects page < 1', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=0&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(400);
  });

  it('search filter narrows results', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=5&search=zzz_no_match_xyz_qwerty')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Forwarded-For', nextIp())
      .expect(200);
    expect(res.body.total).toBe(0);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.totalPages).toBe(1);
  });
});
