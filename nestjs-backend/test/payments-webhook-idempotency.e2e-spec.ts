/**
 * Phase 242 (Voldi-fs) — Payments webhook idempotency e2e.
 *
 * Service-level idempotency regression: aynı `externalTransactionId` (veya
 * aynı `paymentIntentId`) ile gelen webhook replay'i double-process etmemeli.
 *
 * Cases:
 *   1. Aynı payment.completed webhook 2x → payment 1x process; ikinci çağrı
 *      mevcut payment'ı döndürür, completedAt değişmez.
 *   2. Race: 5 paralel payment.completed → payment 1x COMPLETED, terminal state.
 *   3. payment.failed sonrası tekrar gelen aynı eventi skip.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { PaymentsService } from '../src/modules/payments/payments.service';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from '../src/modules/payments/payment.entity';
import { User } from '../src/modules/users/user.entity';

describe('Payments webhook idempotency (e2e — Phase 242)', () => {
  let app: INestApplication;
  let payments: PaymentsService;
  let paymentRepo: Repository<Payment>;
  let userRepo: Repository<User>;
  let customerId: string;
  let workerId: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    payments = app.get(PaymentsService);
    paymentRepo = app.get(getRepositoryToken(Payment));
    userRepo = app.get(getRepositoryToken(User));

    const customer = await userRepo.save(
      userRepo.create({
        email: `webhook-customer-${Date.now()}@test.com`,
        phoneNumber: `5559${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        fullName: 'Webhook Customer',
      } as Partial<User>),
    );
    const worker = await userRepo.save(
      userRepo.create({
        email: `webhook-worker-${Date.now()}@test.com`,
        phoneNumber: `5558${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        fullName: 'Webhook Worker',
      } as Partial<User>),
    );
    customerId = customer.id;
    workerId = worker.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedPendingPayment(opts: {
    paymentIntentId: string;
  }): Promise<Payment> {
    const p = paymentRepo.create({
      customerId,
      workerId,
      amountMinor: 50000,
      currency: 'TRY',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      paymentIntentId: opts.paymentIntentId,
    } as Partial<Payment>);
    return paymentRepo.save(p);
  }

  it('1. Aynı payment.completed webhook 2x → process 1x; ikinci skip', async () => {
    const intent = `pi-replay-${Date.now()}`;
    const ext = `ext-tx-${Date.now()}`;
    await seedPendingPayment({ paymentIntentId: intent });

    const r1 = await payments.handlePaymentWebhook({
      type: 'payment.completed',
      data: { paymentIntentId: intent, externalTransactionId: ext },
    });
    expect(r1).toBeTruthy();
    const completedAt1 = (r1 as Payment).completedAt;
    expect((r1 as Payment).status).toBe(PaymentStatus.COMPLETED);

    // Replay (aynı event)
    const r2 = await payments.handlePaymentWebhook({
      type: 'payment.completed',
      data: { paymentIntentId: intent, externalTransactionId: ext },
    });
    expect(r2).toBeTruthy();
    expect((r2 as Payment).status).toBe(PaymentStatus.COMPLETED);
    // completedAt değişmemiş olmalı (skip path).
    expect((r2 as Payment).completedAt?.getTime()).toBe(
      completedAt1?.getTime(),
    );

    // DB'de bir tek COMPLETED row var.
    const all = await paymentRepo.find({
      where: { externalTransactionId: ext },
    });
    expect(all.length).toBe(1);
  });

  it('2. 5 paralel payment.completed → 1x process, terminal state COMPLETED', async () => {
    const intent = `pi-parallel-${Date.now()}`;
    const ext = `ext-tx-parallel-${Date.now()}`;
    await seedPendingPayment({ paymentIntentId: intent });

    const events = Array.from({ length: 5 }, () => ({
      type: 'payment.completed' as const,
      data: { paymentIntentId: intent, externalTransactionId: ext },
    }));

    await Promise.allSettled(
      events.map((e) => payments.handlePaymentWebhook(e)),
    );

    const all = await paymentRepo.find({
      where: { paymentIntentId: intent },
    });
    expect(all.length).toBe(1);
    expect(all[0].status).toBe(PaymentStatus.COMPLETED);
    expect(all[0].externalTransactionId).toBe(ext);
  });

  it('3. payment.failed sonrası replay → skip, errorMessage overwrite olmaz', async () => {
    const intent = `pi-fail-${Date.now()}`;
    await seedPendingPayment({ paymentIntentId: intent });

    const r1 = await payments.handlePaymentWebhook({
      type: 'payment.failed',
      data: { paymentIntentId: intent, error: 'card declined' },
    });
    expect((r1 as Payment).status).toBe(PaymentStatus.FAILED);
    expect((r1 as Payment).errorMessage).toBe('card declined');

    const r2 = await payments.handlePaymentWebhook({
      type: 'payment.failed',
      data: { paymentIntentId: intent, error: 'different error' },
    });
    expect((r2 as Payment).errorMessage).toBe('card declined');
  });
});
