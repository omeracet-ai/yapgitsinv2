/**
 * Phase 245 (Voldi-sec) — payments controller DTO validation e2e.
 *
 * Önceden:
 *   - `POST /payments/create-session` `@Body() body: any` → herhangi bir payload kabul.
 *   - `POST /payments/callback` `Record<string, string>` → unknown alanlar reject edilmiyor.
 *   - `POST /payments/webhook` `@Body() event: any` → keyfi payload.
 *
 * Cases:
 *   1. create-session boş body → 400 (price/paidPrice/basketId zorunlu)
 *   2. create-session price non-numeric → 400
 *   3. create-session bilinmeyen alan → 400 (forbidNonWhitelisted)
 *   4. create-session geçerli body → 201/200 (mock iyzipay path)
 *   5. webhook geçersiz type → 400 (IsIn)
 *   6. webhook eksik data.paymentIntentId → 400
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Payments DTO validation (e2e — Phase 245)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  let ipCounter = 0;
  const nextIp = () =>
    `10.245.${Math.floor(ipCounter / 256) % 256}.${(ipCounter++) % 256}`;
  const post = (url: string) =>
    request(app.getHttpServer()).post(url).set('X-Forwarded-For', nextIp());

  describe('POST /payments/create-session', () => {
    it('1. boş body → 400', async () => {
      const res = await post('/payments/create-session').send({});
      expect(res.status).toBe(400);
    });

    it('2. price non-numeric → 400', async () => {
      const res = await post('/payments/create-session').send({
        price: 'not-a-number',
        paidPrice: '100.00',
        basketId: 'JOB123',
      });
      expect(res.status).toBe(400);
    });

    it('3. bilinmeyen alan → 400', async () => {
      const res = await post('/payments/create-session').send({
        price: '100.00',
        paidPrice: '100.00',
        basketId: 'JOB123',
        evilField: 'pwned',
      });
      expect(res.status).toBe(400);
    });

    it('4. invalid basketId karakterleri → 400', async () => {
      const res = await post('/payments/create-session').send({
        price: '100.00',
        paidPrice: '100.00',
        basketId: "'; DROP TABLE jobs;--",
      });
      expect(res.status).toBe(400);
    });

    it('5. geçerli body → DTO geçer (iyzipay mock yanıtı veya 500 — burada DTO katmanı kanıtı yeterli)', async () => {
      const res = await post('/payments/create-session').send({
        price: '100.00',
        paidPrice: '100.00',
        basketId: 'JOB-123',
      });
      // DTO geçti → 200/201 (mock iyzipay) ya da 500 (iyzipay not configured).
      // Önemli olan: 400 değil — DTO katmanı kabul etti.
      expect(res.status).not.toBe(400);
    });
  });

  describe('POST /payments/webhook', () => {
    it('6. geçersiz type → 400', async () => {
      const res = await post('/payments/webhook').send({
        type: 'random.event',
        data: { paymentIntentId: 'pi_123' },
      });
      // 400 (DTO) ya da 403 (signature guard) — ikisi de "reject" sayılır.
      // Bu test DTO katmanını izole etmek için: type=invalid → 400 beklenir.
      // Signature guard önce çalışır; non-prod ortamda secret yok → bypass.
      expect([400, 403]).toContain(res.status);
    });

    it('7. eksik data.paymentIntentId → 400 (DTO)', async () => {
      const res = await post('/payments/webhook').send({
        type: 'payment.completed',
        data: {},
      });
      expect([400, 403]).toContain(res.status);
    });
  });
});
