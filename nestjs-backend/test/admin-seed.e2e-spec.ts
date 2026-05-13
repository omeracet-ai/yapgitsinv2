import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * Admin seed endpoint (e2e) — BOOTSTRAP MODE.
 *
 * Phase 181 originally required admin JWT + ALLOW_SEED=1. That created a
 * chicken-and-egg deadlock when the prod admin password fell out of sync
 * with `.env`. Auth was removed; ALLOW_SEED is now the sole gate.
 *
 * Coverage:
 *  - 403 when ALLOW_SEED is not '1' (safety flag) — gate still firm
 *  - 200 when ALLOW_SEED=1 with NO auth header (bootstrap mode); counts honored
 *  - Response carries the `warning` field
 *  - FK integrity: PRAGMA foreign_key_check on SQLite returns []
 *  - Throttle: 5 req/min cap → 6th call → 429
 */
describe('Admin seed (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('rejects when ALLOW_SEED is not set (403)', async () => {
    delete process.env.ALLOW_SEED;
    const res = await http()
      .post('/admin/seed/wipe-and-populate?count=5')
      .expect(403);
    expect(String(res.body.message ?? '')).toMatch(/Seeding disabled/i);
  });

  it('wipes + populates 5 users when ALLOW_SEED=1 (no auth required)', async () => {
    process.env.ALLOW_SEED = '1';
    const res = await http()
      .post('/admin/seed/wipe-and-populate?count=5')
      .expect(201);
    expect(res.body.created.users).toBe(5);
    expect(res.body.created.customers + res.body.created.workers).toBe(5);
    expect(typeof res.body.durationMs).toBe('number');
    expect(String(res.body.warning ?? '')).toMatch(/ALLOW_SEED is active/i);
    delete process.env.ALLOW_SEED;
  });

  it('inserts related rows (jobs, possibly bookings/escrows)', async () => {
    const usersCount = await dataSource.query('SELECT COUNT(*) AS c FROM users');
    expect(Number(usersCount[0].c)).toBe(5);
    const leadsCount = await dataSource.query('SELECT COUNT(*) AS c FROM leads');
    expect(Number(leadsCount[0].c)).toBeGreaterThanOrEqual(1);
  });

  it('FK integrity: PRAGMA foreign_key_check returns no violations', async () => {
    const violations = await dataSource.query('PRAGMA foreign_key_check');
    expect(Array.isArray(violations)).toBe(true);
    expect(violations.length).toBe(0);
  });

  it('throttles bootstrap endpoint (5/min) — rapid calls eventually → 429', async () => {
    process.env.ALLOW_SEED = '1';
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await http().post('/admin/seed/wipe?dummy=' + i);
      codes.push(res.status);
    }
    delete process.env.ALLOW_SEED;
    // Throttle must kick in within 8 rapid calls (limit 5/min shared with prior tests).
    expect(codes.some((c) => c === 429)).toBe(true);
    // Until throttle hits, calls succeed (201). No other status leaks through.
    expect(codes.every((c) => c === 201 || c === 429)).toBe(true);
  });
});
