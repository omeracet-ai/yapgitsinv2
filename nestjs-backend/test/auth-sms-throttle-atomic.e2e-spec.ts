/**
 * Phase 242 (Voldi-fs) — SMS OTP atomicity e2e.
 *
 * Service-level race regression: paralel yanlış denemelerde attempts counter
 * lost-update'e açıktı (`otp.attempts += 1; save(otp)`). Yeni atomic increment
 * pattern'i ile 10 paralel fail = tam 10 attempts olmalı.
 *
 * Cases:
 *   1. 10 paralel yanlış kod denemesi → attempts == 10 (eski pattern'de 1-3).
 *   2. requestSmsOtp() rate-limit: 5 paralel request → en fazla 3 row,
 *      4-5. çağrı BadRequestException.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { SmsOtp } from '../src/modules/auth/sms-otp.entity';

describe('SMS OTP atomicity (e2e — Phase 242)', () => {
  let app: INestApplication;
  let auth: AuthService;
  let smsRepo: Repository<SmsOtp>;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    auth = app.get(AuthService);
    smsRepo = app.get(getRepositoryToken(SmsOtp));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const freshIp = () =>
    `10.242.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

  it('1. 10 paralel yanlış kod → attempts == 10 (atomic increment regression)', async () => {
    const phone = `555000${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;
    const seeded = await smsRepo.save(
      smsRepo.create({
        phoneNumber: phone,
        code: '111111',
        expiresAt: new Date(Date.now() + 5 * 60_000),
        attempts: 0,
        used: false,
      }),
    );

    const ip = freshIp();
    await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        auth.verifySmsOtp(phone, '000000', ip),
      ),
    );

    const fresh = await smsRepo.findOne({ where: { id: seeded.id } });
    // Atomic increment ile 10 fail tam 10 attempt olmalı.
    expect(fresh?.attempts).toBe(10);
  });

  it('2. requestSmsOtp 5 paralel istek → en fazla 3 saklanır, 2 reddedilir', async () => {
    const phone = `555100${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // SmsService mock'lu test ortamında sendSms no-op olur, ama eğer prod gibi
    // try/catch'lemek istersek allSettled ile sarıyoruz.
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => auth.requestSmsOtp(phone)),
    );

    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.filter((r) => r.status === 'rejected').length;

    // Limit 3 ise: en fazla 3 başarı, en az 2 fail. Race nedeniyle 3-4 başarı
    // olabilir; ancak rate-limit hiç çalışmamış olamaz (5 başarı kabul edilmez).
    expect(ok).toBeLessThanOrEqual(3);
    expect(ok + fail).toBe(5);
    expect(fail).toBeGreaterThanOrEqual(2);

    // DB'de bu phone için en fazla 3 OTP row kalmalı (over-insert'ler silinmiş).
    const rows = await smsRepo.find({ where: { phoneNumber: phone } });
    expect(rows.length).toBeLessThanOrEqual(3);
  });
});
