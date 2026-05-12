import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/modules/users/user.entity';

/**
 * E2E coverage for the platform's critical flows (Phase 184 — test debt paydown):
 *   1. Auth: register -> protected endpoint, SMS OTP request/verify (mock-free, log-only SMS), login.
 *   2. Job leads: POST /job-leads with Turkish phone validation -> fetch by id (worker matching is async/non-blocking).
 *   3. Admin: admin/login -> AdminGuard-protected endpoint.
 *
 * DB: isolated in-memory SQLite (see test/setup-e2e.ts). Never touches the real DB.
 */
describe('Critical flows (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts global pipe so DTO validators (e.g. TR phone regex) run.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    // AuthService.onModuleInit seeds admin@yapgitsin.tr with password from
    // ADMIN_INITIAL_PASSWORD (set to 'admin' in test/setup-e2e.ts).
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  // ── 1. Auth flow ─────────────────────────────────────────────────────────
  describe('Auth flow', () => {
    const email = 'newuser@test.com';
    const password = 'Test1234';
    const phone = '5551112233';
    let accessToken: string;
    let userId: string;
    let userRole: string;

    it('registers a new user and returns a JWT', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ email, phoneNumber: phone, password, fullName: 'New User' })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.passwordHash).toBeUndefined();
      accessToken = res.body.access_token;
      userId = res.body.user.id;
      userRole = res.body.user.role;
    });

    it('rejects access to a JWT-protected endpoint without a token', async () => {
      await http().get('/users/me').expect(401);
    });

    it('allows access to a JWT-protected endpoint with the token', async () => {
      const res = await http()
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.email).toBe(email);
    });

    it('accepts a token signed with JWT_SECRET_PREVIOUS (dual-secret rotation window)', async () => {
      // Simulate a token issued before a JWT_SECRET rotation: sign with the old key.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jwt = require('jsonwebtoken');
      const oldKeyToken = jwt.sign(
        { email, sub: userId, role: userRole },
        process.env.JWT_SECRET_PREVIOUS as string,
        { expiresIn: '30d' },
      );
      const res = await http()
        .get('/users/me')
        .set('Authorization', `Bearer ${oldKeyToken}`)
        .expect(200);
      expect(res.body.email).toBe(email);
    });

    it('logs in with email + password', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(email);
    });

    it('rejects login with a wrong password', async () => {
      await http().post('/auth/login').send({ email, password: 'wrong-pass' }).expect(401);
    });

    it('runs the SMS OTP request -> verify flow (SMS provider is log-only in test)', async () => {
      const otpPhone = '05559998877';
      await http().post('/auth/sms/request').send({ phoneNumber: otpPhone }).expect(201);

      // Read the generated code straight from the DB (no real SMS to intercept).
      const row = await dataSource.query(
        `SELECT code FROM sms_otps WHERE phoneNumber = ? ORDER BY createdAt DESC LIMIT 1`,
        ['5559998877'],
      );
      expect(row.length).toBe(1);
      const code: string = row[0].code;

      const res = await http()
        .post('/auth/sms/verify')
        .send({ phoneNumber: otpPhone, code })
        .expect(201);
      // No account exists for this phone yet -> isNewUser, phone verified.
      expect(res.body.phoneVerified).toBe(true);
      expect(res.body.isNewUser).toBe(true);
    });

    it('rejects SMS OTP request with an invalid TR phone number', async () => {
      await http().post('/auth/sms/request').send({ phoneNumber: '12345' }).expect(400);
    });
  });

  // ── 2. Job lead flow ─────────────────────────────────────────────────────
  describe('Job lead flow', () => {
    it('rejects POST /job-leads with an invalid Turkish phone number (DTO validation)', async () => {
      await http()
        .post('/job-leads')
        .send({
          category: 'Temizlik',
          city: 'İstanbul',
          requesterName: 'Ayşe Yılmaz',
          requesterPhone: '12345',
          requesterEmail: 'ayse@test.com',
        })
        .expect(400);
    });

    it('creates a job lead with a valid TR phone, then fetches it by id', async () => {
      const createRes = await http()
        .post('/job-leads')
        .send({
          category: 'Temizlik',
          city: 'İstanbul',
          description: 'Ev temizliği lazım',
          budgetMin: 500,
          budgetMax: 1500,
          requesterName: 'Ayşe Yılmaz',
          requesterPhone: '05551234567',
          requesterEmail: 'ayse@test.com',
          preferredContactTime: 'this_week',
        })
        .expect(201);
      expect(createRes.body.id).toBeDefined();
      expect(createRes.body.status).toBe('open');

      const id = createRes.body.id;
      const getRes = await http().get(`/job-leads/${id}`).expect(200);
      expect(getRes.body.id).toBe(id);
      expect(getRes.body.category).toBe('Temizlik');
      expect(getRes.body.requesterPhone).toBe('05551234567');
    });

    it('rejects an unknown job lead id with 404', async () => {
      await http().get('/job-leads/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  // ── 3. Admin flow ────────────────────────────────────────────────────────
  describe('Admin flow', () => {
    let adminToken: string;

    it('logs in as admin via /auth/admin/login', async () => {
      const res = await http()
        .post('/auth/admin/login')
        .send({ username: 'admin', password: 'admin' })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.role).toBe(UserRole.ADMIN);
      adminToken = res.body.access_token;
    });

    it('rejects admin-only endpoint without a token', async () => {
      await http().get('/admin/leads').expect(401);
    });

    it('rejects admin-only endpoint with a non-admin token', async () => {
      const reg = await http()
        .post('/auth/register')
        .send({ email: 'plainuser@test.com', phoneNumber: '5552223344', password: 'Test1234' })
        .expect(201);
      await http()
        .get('/admin/leads')
        .set('Authorization', `Bearer ${reg.body.access_token}`)
        .expect(403);
    });

    it('allows the admin-only endpoint with an admin token', async () => {
      const res = await http()
        .get('/admin/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // findFiltered returns a paginated shape; just assert it responded with an object.
      expect(res.body).toBeDefined();
    });
  });
});
