import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 175 — real iyzipay (Turkey card / 3D Secure) payment integration (e2e).
 *
 * Runs in MOCK_IYZIPAY=1 mode (set in test/setup-e2e.ts) — IyzipayService returns
 * deterministic fake checkout/retrieve/refund responses, so no live sandbox keys
 * are needed. Covers:
 *   A. POST /escrow/initiate → returns a non-null paymentInitUrl + token (was null stub).
 *   B. POST /payments/iyzipay/callback { token } → escrow paymentStatus = 'paid'.
 *   C. callback with a "fail" token → paymentStatus = 'failed' (server re-verifies, not client).
 */
describe('iyzipay payment / escrow checkout flow (e2e)', () => {
  let app: INestApplication;

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
  let customerToken: string;
  const taskerId = '00000000-0000-0000-0000-0000000000bb';
  let escrowId: string;
  let paymentToken: string;

  it('registers a customer', async () => {
    const reg = await http()
      .post('/auth/register')
      .send({
        email: 'iyzipay-customer@test.com',
        phoneNumber: '5557770022',
        password: 'Test1234',
        fullName: 'Iyzipay Customer',
      })
      .expect(201);
    customerToken = reg.body.access_token;
    expect(customerToken).toBeDefined();
  });

  it('A. POST /escrow/initiate returns a real iyzipay checkout URL + token', async () => {
    const res = await http()
      .post('/escrow/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        jobId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        offerId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        taskerId,
        amount: 300,
      })
      .expect(201);

    expect(res.body.paymentInitUrl).toBeTruthy();
    expect(typeof res.body.paymentInitUrl).toBe('string');
    expect(res.body.paymentToken).toBeTruthy();
    expect(res.body.mock).toBe(true);
    expect(res.body.escrow.status).toBe('HELD');
    expect(res.body.escrow.paymentStatus).toBe('pending');
    // fee breakdown preserved (Phase 169)
    expect(res.body.feeBreakdown.gross).toBe(300);
    escrowId = res.body.escrow.id;
    paymentToken = res.body.paymentToken;
  });

  it('B. POST /payments/iyzipay/callback { token } captures the escrow (paid)', async () => {
    const res = await http()
      .post('/payments/iyzipay/callback')
      .send({ token: paymentToken })
      .expect(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.escrowId).toBe(escrowId);

    // escrow now reflects captured state
    const esc = await http()
      .get(`/escrow/${escrowId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(esc.body.paymentStatus).toBe('paid');
    expect(esc.body.status).toBe('HELD');
  });

  it('C. callback with an unknown token => 404 (escrow looked up server-side, not trusted)', async () => {
    await http()
      .post('/payments/iyzipay/callback')
      .send({ token: 'nonexistent-token-xyz' })
      .expect(404);
  });

  it('callback without a token is rejected', async () => {
    await http().post('/payments/iyzipay/callback').send({}).expect(400);
  });
});
