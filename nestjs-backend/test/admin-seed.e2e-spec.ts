import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * Phase 181 — Admin seed endpoint (e2e).
 *
 * Coverage:
 *  - 401 / 403 without auth or with non-admin token
 *  - 403 when ALLOW_SEED is not '1' (safety flag)
 *  - 200 when admin + ALLOW_SEED=1; counts honored
 *  - FK integrity: PRAGMA foreign_key_check on SQLite returns []
 */
describe('Admin seed (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  let adminToken: string;
  let userToken: string;

  it('bootstraps admin and user tokens', async () => {
    const adm = await http()
      .post('/auth/admin/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201);
    adminToken = adm.body.access_token;
    expect(adminToken).toBeDefined();

    const reg = await http()
      .post('/auth/register')
      .send({
        email: 'seed-user@test.com',
        phoneNumber: '5559990022',
        password: 'Test1234',
        fullName: 'Seed User',
      })
      .expect(201);
    userToken = reg.body.access_token;
  });

  it('rejects unauthenticated request', async () => {
    await http().post('/admin/seed/wipe-and-populate?count=5').expect(401);
  });

  it('rejects non-admin token (403)', async () => {
    await http()
      .post('/admin/seed/wipe-and-populate?count=5')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('rejects when ALLOW_SEED is not set (403)', async () => {
    delete process.env.ALLOW_SEED;
    const res = await http()
      .post('/admin/seed/wipe-and-populate?count=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    expect(String(res.body.message ?? '')).toMatch(/Seeding disabled/i);
  });

  it('wipes + populates 5 users when ALLOW_SEED=1', async () => {
    process.env.ALLOW_SEED = '1';
    const res = await http()
      .post('/admin/seed/wipe-and-populate?count=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(res.body.created.users).toBe(5);
    expect(res.body.created.customers + res.body.created.workers).toBe(5);
    expect(typeof res.body.durationMs).toBe('number');
    delete process.env.ALLOW_SEED;
  });

  it('inserts related rows (jobs, possibly bookings/escrows)', async () => {
    const usersCount = await dataSource.query('SELECT COUNT(*) AS c FROM users');
    expect(Number(usersCount[0].c)).toBe(5);
    const leadsCount = await dataSource.query('SELECT COUNT(*) AS c FROM leads');
    // count/5 => at least 1 job lead is created
    expect(Number(leadsCount[0].c)).toBeGreaterThanOrEqual(1);
  });

  it('FK integrity: PRAGMA foreign_key_check returns no violations', async () => {
    const violations = await dataSource.query('PRAGMA foreign_key_check');
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.length).toBe(0);
  });
});
