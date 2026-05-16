/**
 * Phase 231 (Voldi-sec) — DB-level per-IP OTP lockout e2e.
 *
 * Defence-in-depth III: even if the in-memory HTTP throttler resets on app
 * restart, the per-IP failure counter persists in `ip_otp_lockouts`.
 *
 * We exercise AuthService directly (not via HTTP) to isolate the DB layer
 * from the HTTP throttle bucket — that bucket would otherwise cap us at 5
 * before we ever hit the DB-level 15 threshold. The HTTP layer is covered
 * by auth-sms-verify-throttle.e2e-spec.ts (Phase 230).
 *
 * Threshold: 15 failures / 15dk per IP → 30dk lockout.
 *
 * Cases:
 *   1. HTTP throttle bypass simulation (≥15 DB-fails on one IP) → 403
 *   2. Multi-phone same-IP: 3 phones × 5 fails = 15 → 16th attempt 403
 *   3. Success resets the counter (4 fails + 1 success → fresh budget)
 *   4. Lockout expiry: rewind clock past lockedUntil → verify works again
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { SmsOtp } from '../src/modules/auth/sms-otp.entity';
import { IpOtpLockout } from '../src/modules/auth/ip-otp-lockout.entity';
import { IpOtpLockoutCleanupService } from '../src/modules/auth/ip-otp-lockout-cleanup.service';

describe('DB-level per-IP OTP lockout (e2e — Phase 231)', () => {
  let app: INestApplication;
  let auth: AuthService;
  let smsRepo: Repository<SmsOtp>;
  let lockoutRepo: Repository<IpOtpLockout>;
  let cleanup: IpOtpLockoutCleanupService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    auth = app.get(AuthService);
    smsRepo = app.get(getRepositoryToken(SmsOtp));
    lockoutRepo = app.get(getRepositoryToken(IpOtpLockout));
    cleanup = app.get(IpOtpLockoutCleanupService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  /** Helper: seed a real OTP row for a phone with a known code. */
  async function seedOtp(phone: string, code = '123456') {
    const row = smsRepo.create({
      phoneNumber: phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      attempts: 0,
      used: false,
    });
    return smsRepo.save(row);
  }

  /** Fresh IP per test so cases don't bleed. */
  const freshIp = () => `10.231.${(Date.now() / 1000) & 0xff}.${Math.floor(Math.random() * 250) + 1}`;

  it('1. ≥15 DB-fails on one IP triggers ForbiddenException (HTTP throttle bypass scenario)', async () => {
    const ip = freshIp();
    const phone = '5550000001';
    await seedOtp(phone, '999999');

    // 15 wrong codes — service-level (no HTTP throttle in the path)
    let lastErr: unknown = null;
    for (let i = 0; i < 15; i++) {
      try {
        await auth.verifySmsOtp(phone, '000000', ip);
      } catch (e) {
        lastErr = e;
      }
    }
    // After 15 failures the IP must be locked
    const row = await lockoutRepo.findOne({ where: { ip } });
    expect(row).toBeTruthy();
    expect(row!.attempts).toBeGreaterThanOrEqual(15);
    expect(row!.lockedUntil).not.toBeNull();
    expect(row!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // 16th must throw Forbidden (lockout), not BadRequest
    await expect(auth.verifySmsOtp(phone, '000000', ip)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(lastErr).toBeTruthy();
  });

  it('2. multi-phone same-IP: 3 phones × 5 fails = 15 → 16th rejected', async () => {
    const ip = freshIp();
    const phones = ['5550000010', '5550000011', '5550000012'];
    for (const p of phones) await seedOtp(p, '888888');

    // 3 × 5 = 15 wrong attempts spread across phones
    for (const p of phones) {
      for (let i = 0; i < 5; i++) {
        try {
          await auth.verifySmsOtp(p, '111111', ip);
        } catch {
          // expected
        }
      }
    }
    const row = await lockoutRepo.findOne({ where: { ip } });
    expect(row).toBeTruthy();
    expect(row!.attempts).toBeGreaterThanOrEqual(15);
    expect(row!.lockedUntil).not.toBeNull();

    // Any further attempt from this IP — even on a fresh phone — must be locked
    await seedOtp('5550000013', '777777');
    await expect(
      auth.verifySmsOtp('5550000013', '777777', ip),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('3. successful verify resets the per-IP counter', async () => {
    const ip = freshIp();
    const phone = '5550000020';
    await seedOtp(phone, '555555');

    // 4 fails
    for (let i = 0; i < 4; i++) {
      try {
        await auth.verifySmsOtp(phone, '000000', ip);
      } catch {
        // expected
      }
    }
    let row = await lockoutRepo.findOne({ where: { ip } });
    expect(row?.attempts).toBeGreaterThanOrEqual(4);

    // Success
    const res = await auth.verifySmsOtp(phone, '555555', ip);
    expect(res).toBeTruthy();

    row = await lockoutRepo.findOne({ where: { ip } });
    expect(row?.attempts).toBe(0);
    expect(row?.lockedUntil).toBeNull();

    // Fresh budget: another phone can take 5 more fails without lockout
    await seedOtp('5550000021', '444444');
    for (let i = 0; i < 5; i++) {
      try {
        await auth.verifySmsOtp('5550000021', '000000', ip);
      } catch {
        // expected — these are BadRequest, NOT Forbidden
      }
    }
    row = await lockoutRepo.findOne({ where: { ip } });
    // attempts should be ~5, well under threshold
    expect(row!.attempts).toBeLessThan(15);
    expect(row!.lockedUntil).toBeNull();
  });

  it('4. lockout expiry: past lockedUntil → verify works again', async () => {
    const ip = freshIp();
    const phone = '5550000030';
    await seedOtp(phone, '333333');

    // Manually seed a lockout in the past
    await lockoutRepo.save(
      lockoutRepo.create({
        ip,
        attempts: 15,
        windowStartedAt: new Date(Date.now() - 60 * 60_000),
        lockedUntil: new Date(Date.now() - 60_000), // expired 1min ago
      }),
    );

    // verify with correct code → should NOT throw Forbidden; lockout cleared
    const res = await auth.verifySmsOtp(phone, '333333', ip);
    expect(res).toBeTruthy();

    const row = await lockoutRepo.findOne({ where: { ip } });
    // After success, counter+lockout cleared
    expect(row?.attempts).toBe(0);
    expect(row?.lockedUntil).toBeNull();
  });

  /**
   * Phase 232 — Cleanup cron: idle row sil, kilitli row koru.
   */
  it('5. cleanup cron removes idle rows, preserves locked ones (Phase 232)', async () => {
    const idleIp = `10.232.${Math.floor(Math.random() * 250) + 1}.10`;
    const lockedIp = `10.232.${Math.floor(Math.random() * 250) + 1}.20`;
    const freshIdleIp = `10.232.${Math.floor(Math.random() * 250) + 1}.30`;
    const veryOldFakeDate = new Date(Date.now() - 48 * 60 * 60_000); // 48h ago

    // 1) Idle (24h+) ve kilitsiz — silinmeli
    await lockoutRepo.save(
      lockoutRepo.create({
        ip: idleIp,
        attempts: 3,
        windowStartedAt: veryOldFakeDate,
        lockedUntil: null,
      }),
    );
    // updatedAt'i geriye al (TypeORM UpdateDateColumn auto, manuel update gerek)
    await lockoutRepo.query(
      `UPDATE ip_otp_lockouts SET "updatedAt" = ? WHERE "ip" = ?`,
      [veryOldFakeDate.toISOString(), idleIp],
    );

    // 2) Halen kilitli — korunmalı
    await lockoutRepo.save(
      lockoutRepo.create({
        ip: lockedIp,
        attempts: 20,
        windowStartedAt: veryOldFakeDate,
        lockedUntil: new Date(Date.now() + 60 * 60_000), // 1h ahead
      }),
    );

    // 3) Yeni (idle değil) — korunmalı
    await lockoutRepo.save(
      lockoutRepo.create({
        ip: freshIdleIp,
        attempts: 2,
        windowStartedAt: new Date(),
        lockedUntil: null,
      }),
    );

    const removed = await cleanup.runNow();
    expect(removed).toBeGreaterThanOrEqual(1);

    expect(await lockoutRepo.findOne({ where: { ip: idleIp } })).toBeNull();
    expect(await lockoutRepo.findOne({ where: { ip: lockedIp } })).toBeTruthy();
    expect(
      await lockoutRepo.findOne({ where: { ip: freshIdleIp } }),
    ).toBeTruthy();
  });
});
