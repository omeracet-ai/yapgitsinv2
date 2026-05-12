import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 169 — Airtasker-style service-fee / escrow flow (e2e).
 *
 *   A. hold (POST /escrow/initiate) → feeBreakdown is transparent + correct
 *      (gross = feeAmount + workerNet, feePct = PLATFORM_FEE_PCT default 10).
 *   B. release (POST /escrow/:id/release by customer) → status RELEASED,
 *      taskerNetAmount + platformFeeAmount match the breakdown.
 *   C. a second escrow → admin refund (PATCH /admin/escrow/:id/refund) → status REFUNDED.
 *   D. double-release on a RELEASED escrow is rejected (state machine).
 *
 * DB: isolated in-memory SQLite (see test/setup-e2e.ts). PLATFORM_FEE_PCT is
 * unset in tests → FeeService falls back to 10%.
 */
describe('Escrow / service-fee flow (e2e)', () => {
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

  let customerToken: string;
  let adminToken: string;
  const taskerId = '00000000-0000-0000-0000-0000000000aa';
  const FEE_PCT = 10;

  it('sets up a customer + admin token', async () => {
    const reg = await http()
      .post('/auth/register')
      .send({
        email: 'escrow-customer@test.com',
        phoneNumber: '5559990011',
        password: 'Test1234',
        fullName: 'Escrow Customer',
      })
      .expect(201);
    customerToken = reg.body.access_token;
    expect(customerToken).toBeDefined();

    const adm = await http()
      .post('/auth/admin/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201);
    adminToken = adm.body.access_token;
    expect(adminToken).toBeDefined();
  });

  let escrowId: string;

  it('A. holds escrow and returns a transparent fee breakdown', async () => {
    const res = await http()
      .post('/escrow/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        jobId: '11111111-1111-1111-1111-111111111111',
        offerId: '22222222-2222-2222-2222-222222222222',
        taskerId,
        amount: 100,
      })
      .expect(201);

    const fb = res.body.feeBreakdown;
    expect(fb).toBeDefined();
    expect(fb.gross).toBe(100);
    expect(fb.feePct).toBe(FEE_PCT);
    expect(fb.feeAmount).toBe(10);
    expect(fb.workerNet).toBe(90);
    // gross === feeAmount + workerNet (no money leaks)
    expect(fb.feeAmount + fb.workerNet).toBeCloseTo(fb.gross, 2);

    expect(res.body.escrow.status).toBe('HELD');
    expect(res.body.escrow.feeBreakdown).toBeDefined();
    escrowId = res.body.escrow.id;
    expect(escrowId).toBeDefined();
  });

  it('B. customer releases escrow → RELEASED with worker net + platform fee', async () => {
    const res = await http()
      .post(`/escrow/${escrowId}/release`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'job completed' })
      .expect(201);

    expect(res.body.status).toBe('RELEASED');
    expect(res.body.platformFeePct).toBe(FEE_PCT);
    expect(res.body.platformFeeAmount).toBeCloseTo(10, 2);
    expect(res.body.taskerNetAmount).toBeCloseTo(90, 2);
    expect(res.body.releaseReason).toBe('job completed');
  });

  it('D. a second release on a RELEASED escrow is rejected (state machine)', async () => {
    await http()
      .post(`/escrow/${escrowId}/release`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({})
      .expect(400);
  });

  let refundEscrowId: string;

  it('C. admin refunds a fresh escrow → REFUNDED', async () => {
    const held = await http()
      .post('/escrow/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        jobId: '33333333-3333-3333-3333-333333333333',
        offerId: '44444444-4444-4444-4444-444444444444',
        taskerId,
        amount: 250,
      })
      .expect(201);
    refundEscrowId = held.body.escrow.id;

    const res = await http()
      .patch(`/admin/escrow/${refundEscrowId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'customer cancelled' })
      .expect(200);

    expect(res.body.status).toBe('REFUNDED');
    expect(res.body.refundAmount).toBeCloseTo(250, 2);
    expect(res.body.refundReason).toBe('customer cancelled');
  });

  it('rejects a non-admin caller on the admin refund endpoint', async () => {
    await http()
      .patch(`/admin/escrow/${refundEscrowId}/refund`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({})
      .expect(403);
  });
});
