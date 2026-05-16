/**
 * Phase 245 (Voldi-sec) — webhook signature guard e2e.
 *
 * `POST /payments/webhook` HMAC-SHA256 signature verification:
 *   - Secret tanımlı (PAYMENTS_WEBHOOK_SECRET) + header eksik → 403
 *   - Secret tanımlı + invalid signature → 403
 *   - Secret tanımlı + valid signature → 200
 *
 * Secret non-prod'da unset olduğunda guard bypass + warn loglar (setup-e2e.ts
 * NODE_ENV=test). Bu test'lerin signature path'i exercise etmesi için suite
 * boyunca PAYMENTS_WEBHOOK_SECRET set ediyoruz.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from '../src/modules/payments/payment.entity';
import { User } from '../src/modules/users/user.entity';

describe('Payments webhook signature guard (e2e — Phase 245)', () => {
  let app: INestApplication;
  let paymentRepo: Repository<Payment>;
  let userRepo: Repository<User>;
  const SECRET = 'phase-245-test-webhook-secret';
  let paymentIntentId: string;

  beforeAll(async () => {
    process.env.PAYMENTS_WEBHOOK_SECRET = SECRET;
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    paymentRepo = app.get(getRepositoryToken(Payment));
    userRepo = app.get(getRepositoryToken(User));

    // Seed: bir customer + worker + PENDING payment (webhook hedef alacak).
    const c = await userRepo.save(
      userRepo.create({
        email: `sig-c-${Date.now()}@test.com`,
        phoneNumber: `5557${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        fullName: 'Sig Customer',
      } as Partial<User>),
    );
    const w = await userRepo.save(
      userRepo.create({
        email: `sig-w-${Date.now()}@test.com`,
        phoneNumber: `5556${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        fullName: 'Sig Worker',
      } as Partial<User>),
    );
    paymentIntentId = `pi_sigtest_${Date.now()}`;
    await paymentRepo.save(
      paymentRepo.create({
        customerId: c.id,
        workerId: w.id,
        amountMinor: 10000,
        currency: 'TRY',
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MOCK,
        paymentIntentId,
        idempotencyKey: paymentIntentId,
      }),
    );
  });

  afterAll(async () => {
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
    if (app) await app.close();
  });

  let ipCounter = 0;
  const nextIp = () =>
    `10.246.${Math.floor(ipCounter / 256) % 256}.${(ipCounter++) % 256}`;
  const post = (url: string) =>
    request(app.getHttpServer()).post(url).set('X-Forwarded-For', nextIp());

  const sign = (body: unknown): string =>
    crypto.createHmac('sha256', SECRET).update(JSON.stringify(body)).digest('hex');

  it('1. signature header eksik → 403', async () => {
    const body = {
      type: 'payment.completed',
      data: { paymentIntentId, externalTransactionId: 'ext_attack_1' },
    };
    const res = await post('/payments/webhook').send(body);
    expect(res.status).toBe(403);
  });

  it('2. invalid signature → 403', async () => {
    const body = {
      type: 'payment.completed',
      data: { paymentIntentId, externalTransactionId: 'ext_attack_2' },
    };
    const res = await post('/payments/webhook')
      .set('X-Webhook-Signature', 'deadbeef')
      .send(body);
    expect(res.status).toBe(403);
  });

  it('3. valid signature → 200', async () => {
    const body = {
      type: 'payment.completed',
      data: { paymentIntentId, externalTransactionId: 'ext_ok_3' },
    };
    const sig = sign(body);
    const res = await post('/payments/webhook')
      .set('X-Webhook-Signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // Side-effect: payment COMPLETED'a geçti.
    const updated = await paymentRepo.findOne({ where: { paymentIntentId } });
    expect(updated?.status).toBe(PaymentStatus.COMPLETED);
    expect(updated?.externalTransactionId).toBe('ext_ok_3');
  });

  it('4. X-Iyzipay-Signature header alternatifi de kabul edilir', async () => {
    // Aynı payment zaten COMPLETED — idempotency skip path da bu test'te.
    const body = {
      type: 'payment.completed',
      data: { paymentIntentId, externalTransactionId: 'ext_ok_3' },
    };
    const sig = sign(body);
    const res = await post('/payments/webhook')
      .set('X-Iyzipay-Signature', sig)
      .send(body);
    expect(res.status).toBe(200);
  });

  it('5. signature mismatch (length farklı) → 403, timingSafe path crash etmez', async () => {
    const body = { type: 'payment.completed', data: { paymentIntentId } };
    const res = await post('/payments/webhook')
      .set('X-Webhook-Signature', 'short')
      .send(body);
    expect(res.status).toBe(403);
  });
});
