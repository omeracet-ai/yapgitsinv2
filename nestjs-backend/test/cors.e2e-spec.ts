import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Phase 179 — Intermittent 500 on OPTIONS /auth/admin/login regression guard.
 *
 * The CORS originFn used to call cb(new Error(...), false) on disallowed origins,
 * which propagated as a 500 on preflight requests. The fix: cb(null, false) — Nest
 * sends a clean response with no ACAO header; the browser blocks on its end.
 */
describe('CORS originFn (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    // Mirror main.ts CORS wiring (dev mode: empty allowlist → permissive, so we
    // explicitly pass an allowlist to exercise the deny path).
    const allowed = ['https://yapgitsin.tr'];
    app.enableCors({
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (allowed.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('OPTIONS with disallowed Origin must NOT return 500 (no ACAO header)', async () => {
    const res = await request(app.getHttpServer())
      .options('/stats/public')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'POST');
    // The critical assertion: not a 500. cors with cb(null, false) returns 204
    // (express-cors) or the route may 404; either way NOT 500.
    expect(res.status).not.toBe(500);
    expect(res.status).toBeLessThan(500);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('OPTIONS with allowed Origin returns ACAO header (no 500)', async () => {
    const res = await request(app.getHttpServer())
      .options('/stats/public')
      .set('Origin', 'https://yapgitsin.tr')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).not.toBe(500);
    expect(res.headers['access-control-allow-origin']).toBe('https://yapgitsin.tr');
  });

  it('GET with disallowed Origin still serves the request (no 500, no ACAO)', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://evil.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
