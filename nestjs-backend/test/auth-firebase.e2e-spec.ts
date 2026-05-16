/**
 * Phase 228 (Voldi-sec) — POST /auth/firebase e2e supertest.
 *
 * HTTP layer: controller + Throttle + ValidationPipe + global guards +
 * serialization. firebase-admin is fully mocked (virtual) — no network.
 *
 * Cases:
 *   1. 200 happy path (new user)            — provider, tokens, no passwordHash
 *   2. 401 missing idToken (empty body)     — controller forwards undefined → service throws
 *   3. 401 invalid token                    — verifyIdToken rejects
 *   4. 401 firebase creds missing           — FIREBASE_SERVICE_ACCOUNT_JSON unset
 *   5. 403 suspended user                   — existing user.suspended=true
 *   6. Throttle (auth-login bucket)         — 21st request from same IP → 429
 *   7. Content-Type non-JSON                — body sent as text/plain → 400/401
 *   8. Email link path                      — existing email user gets firebaseUid set, same id
 *   9. New user creation                    — placeholder phone "firebase:<uid>"
 */

// ── firebase-admin virtual mock (must come BEFORE module imports) ───────────
const verifyIdTokenMock = jest.fn();
const authFnMock = jest.fn(() => ({ verifyIdToken: verifyIdTokenMock }));
const initializeAppMock = jest.fn();
const certMock = jest.fn(() => ({}));

jest.mock(
  'firebase-admin',
  () => ({
    __esModule: false,
    apps: [] as unknown[],
    initializeApp: (...args: unknown[]) => initializeAppMock(...args),
    credential: { cert: (...args: unknown[]) => certMock(...args) },
    auth: (...args: unknown[]) => authFnMock(...args),
  }),
  { virtual: true },
);

// Provide creds BEFORE AuthService.onModuleInit() runs.
const FAKE_SA = JSON.stringify({
  type: 'service_account',
  project_id: 'fake',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  client_email: 'fake@fake.iam.gserviceaccount.com',
});
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FAKE_SA;

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';

describe('POST /auth/firebase (e2e — Phase 228)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const buildApp = async (): Promise<INestApplication> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const a = moduleFixture.createNestApplication();
    a.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await a.init();
    return a;
  };

  beforeAll(async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FAKE_SA;
    app = await buildApp();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // reset firebase-admin apps so initFirebaseAdmin can re-init cleanly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin') as { apps: unknown[] };
    admin.apps.length = 0;
  });

  const http = () => request(app.getHttpServer());

  // Each test gets a unique fbUid + IP to avoid collisions and throttle sharing.
  // fbUid kept short so `firebase:<uid>`.slice(0,20) is still unique per row.
  let testIdx = 0;
  const nextFbUid = () => {
    testIdx++;
    const rnd = Math.random().toString(36).slice(2, 8);
    return `e${testIdx}${rnd}`; // ~8 chars → `firebase:e1abc123` fits in 20
  };
  const nextIp = () =>
    `10.${100 + (testIdx % 100)}.${(testIdx * 7) % 250}.${(Date.now() + testIdx) % 250 + 1}`;

  // ─────────────────────────────────────────────────────────────────────────
  it('1. 200 happy path — returns tokens + user, no passwordHash', async () => {
    const uid = nextFbUid();
    verifyIdTokenMock.mockResolvedValue({
      uid,
      email: `${uid}@example.com`,
      email_verified: true,
      name: 'Firebase Happy',
      firebase: { sign_in_provider: 'google.com' },
    });

    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: 'good_token' })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    // Manual strip in service: passwordHash must not appear.
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.provider).toBe('google.com');
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('2. missing idToken → 401 (service rejects undefined)', async () => {
    const r1 = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: '' })
      .expect(401);
    expect(r1.body.message).toMatch(/Firebase ID token gerekli/);

    const r2 = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({})
      .expect(401);
    expect(r2.body.message).toMatch(/Firebase ID token gerekli/);

    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('3. invalid token → 401 (verifyIdToken rejects)', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('id-token-expired'));

    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: 'bad_token' })
      .expect(401);

    expect(res.body.message).toMatch(/Firebase token geçersiz/);
    expect(verifyIdTokenMock).toHaveBeenCalledTimes(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('4. credentials missing → 401 (firebase bridge unavailable)', async () => {
    // Spin a fresh app with the env var unset BEFORE module init.
    const savedSa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin') as { apps: unknown[] };
    admin.apps.length = 0;

    let app2: INestApplication | null = null;
    try {
      app2 = await buildApp();
      const res = await request(app2.getHttpServer())
        .post('/auth/firebase')
        .set('X-Forwarded-For', nextIp())
        .send({ idToken: 'whatever' })
        .expect(401);
      expect(res.body.message).toMatch(/Sosyal giriş geçici olarak kullanılamıyor/);
      expect(verifyIdTokenMock).not.toHaveBeenCalled();
    } finally {
      if (app2) await app2.close();
      if (savedSa) process.env.FIREBASE_SERVICE_ACCOUNT_JSON = savedSa;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('5. suspended user → 403', async () => {
    const uid = nextFbUid();
    const email = `${uid}@example.com`;

    // Pre-seed a suspended user with this firebaseUid.
    const repo = ds.getRepository(User);
    const created = await repo.save(
      repo.create({
        fullName: 'Suspended',
        email,
        phoneNumber: `0555${Math.floor(Math.random() * 9000000 + 1000000)}`,
        passwordHash: 'x',
        firebaseUid: uid,
        suspended: true,
      } as Partial<User>),
    );
    expect(created.id).toBeDefined();

    verifyIdTokenMock.mockResolvedValue({
      uid,
      email,
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });

    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: 'tok' })
      .expect(403);

    expect(res.body.message).toMatch(/Hesap askıda/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('6. throttle: rapid same-IP requests eventually return 429', async () => {
    // Use a dedicated, RFC5737 IP so this test's bucket is fully isolated.
    const ip = `192.0.2.${(Date.now() % 250) + 1}`;
    // Make verifyIdToken always reject — we only care about throttle, not 200s.
    verifyIdTokenMock.mockRejectedValue(new Error('throttle-probe'));

    // Fire 21 requests. The effective per-route limit is min of all named
    // throttlers (auth-login:20 + auth-register:10 + others); we just assert
    // SOME request in the burst returns 429 and earlier ones do not, proving
    // the global ThrottlerGuard is wired in front of /auth/firebase.
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const r = await http()
        .post('/auth/firebase')
        .set('X-Forwarded-For', ip)
        .send({ idToken: `tok_${i}` });
      statuses.push(r.status);
    }

    expect(statuses[0]).not.toBe(429);
    expect(statuses.some((s) => s === 429)).toBe(true);
    // Last request must be throttled (well past every configured limit).
    expect(statuses[statuses.length - 1]).toBe(429);
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('7. non-JSON Content-Type → rejected (400/401/415)', async () => {
    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .set('Content-Type', 'text/plain')
      .send('idToken=foo');
    // NestJS+Express body-parser will not populate body → controller sees
    // body?.idToken === undefined → service throws 401 "gerekli".
    // Some Nest versions may surface 400/415 instead; accept any of them.
    expect([400, 401, 415]).toContain(res.status);
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('8. email link path: existing email user → same id, firebaseUid linked', async () => {
    const uid = nextFbUid();
    const email = `linkable_${uid}@example.com`;

    // Pre-seed an email/password user WITHOUT firebaseUid.
    const repo = ds.getRepository(User);
    const seed = await repo.save(
      repo.create({
        fullName: 'Email First',
        email,
        phoneNumber: `0555${Math.floor(Math.random() * 9000000 + 1000000)}`,
        passwordHash: 'bcrypt-hash',
        firebaseUid: null,
        emailVerified: false,
      } as Partial<User>),
    );
    const beforeCount = await repo.count();

    verifyIdTokenMock.mockResolvedValue({
      uid,
      email,
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    });

    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: 'tok' })
      .expect(201);

    expect(res.body.user.id).toBe(seed.id);
    expect(res.body.user.passwordHash).toBeUndefined();

    // No new row was inserted, and firebaseUid is now linked.
    const afterCount = await repo.count();
    expect(afterCount).toBe(beforeCount);
    const reloaded = await repo.findOne({ where: { id: seed.id } });
    expect(reloaded?.firebaseUid).toBe(uid);
  });

  // ─────────────────────────────────────────────────────────────────────────
  it('9. new user creation: placeholder phone "firebase:<uid>"', async () => {
    const uid = nextFbUid();
    const email = `fresh_${uid}@example.com`;

    const repo = ds.getRepository(User);
    const before = await repo.count();

    verifyIdTokenMock.mockResolvedValue({
      uid,
      email,
      email_verified: true,
      name: 'Fresh Firebase',
      firebase: { sign_in_provider: 'google.com' },
    });

    const res = await http()
      .post('/auth/firebase')
      .set('X-Forwarded-For', nextIp())
      .send({ idToken: 'tok' })
      .expect(201);

    expect(res.body.user.phoneNumber).toMatch(/^firebase:/);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();

    const after = await repo.count();
    expect(after).toBe(before + 1);

    const row = await repo.findOne({ where: { firebaseUid: uid } });
    expect(row).toBeTruthy();
    expect(row!.phoneNumber.startsWith('firebase:')).toBe(true);
  });
});
