import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 188 — subscription iyzipay WebView checkout flow (e2e).
 *
 * Runs in MOCK_IYZIPAY=1 mode (see test/setup-e2e.ts). Covers:
 *   A. POST /subscriptions/subscribe → returns paymentUrl + paymentToken,
 *      subscription is pending_payment (not yet active).
 *   B. POST /subscriptions/confirm { token } → re-verifies via iyzipay,
 *      flips subscription to active, /subscriptions/my returns it.
 *   C. Confirm with a "fail" token → 400, subscription does not activate.
 */
describe('subscription iyzipay WebView flow (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let paymentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('registers a customer', async () => {
    const reg = await http()
      .post('/auth/register')
      .send({
        email: 'sub-iyzipay@test.com',
        phoneNumber: '5557770199',
        password: 'Test1234',
        fullName: 'Sub Customer',
      })
      .expect(201);
    token = reg.body.access_token;
    expect(token).toBeDefined();
  });

  it('A. POST /subscriptions/subscribe returns paymentUrl + token (mock)', async () => {
    const res = await http()
      .post('/subscriptions/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ planKey: 'pro_monthly' })
      .expect(201);

    expect(res.body.subscriptionId).toBeTruthy();
    expect(res.body.paymentUrl).toMatch(/^https?:\/\//);
    expect(res.body.paymentToken).toBeTruthy();
    expect(res.body.mock).toBe(true);
    paymentToken = res.body.paymentToken;

    // /subscriptions/my must still be empty — not yet active.
    // Controller returns `null`; supertest serialises as empty object body.
    const my = await http()
      .get('/subscriptions/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const isEmpty = !my.body || Object.keys(my.body as object).length === 0;
    expect(isEmpty).toBe(true);
  });

  it('B. POST /subscriptions/confirm { token } activates the subscription', async () => {
    const res = await http()
      .post('/subscriptions/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: paymentToken })
      .expect(201);
    expect(res.body.status).toBe('active');

    const my = await http()
      .get('/subscriptions/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(my.body).toBeTruthy();
    expect(my.body.status).toBe('active');
    expect(my.body.plan.key).toBe('pro_monthly');
  });

  it('C. confirm without token => 400', async () => {
    await http()
      .post('/subscriptions/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
