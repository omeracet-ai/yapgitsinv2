import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 177 — Worker calendar .ics export (e2e).
 *
 *   A. GET /users/me/calendar.ics without auth → 401.
 *   B. GET /users/me/calendar.ics with JWT → 200, Content-Type text/calendar,
 *      body contains BEGIN:VCALENDAR / END:VCALENDAR envelope.
 */
describe('Worker calendar .ics export (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'calendar-worker@test.com',
        phoneNumber: '5559991177',
        password: 'Test1234',
        fullName: 'Calendar Worker',
      })
      .expect(201);
    token = reg.body.access_token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('A. rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .get('/users/me/calendar.ics')
      .expect(401);
  });

  it('B. returns text/calendar with a valid VCALENDAR envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me/calendar.ics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/calendar/);
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('VERSION:2.0');
    expect(res.text).toContain('END:VCALENDAR');
  });

  // ── Phase 179 — URL-token subscribe-by-URL ─────────────────────────────
  describe('Phase 179 — URL token feed', () => {
    let urlToken: string;

    it('C. POST /users/me/calendar/token issues a token + URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/calendar/token')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
      expect(res.body.url).toContain('/calendar/');
      expect(res.body.url).toContain('/feed.ics');
      urlToken = res.body.token;
    });

    it('D. public GET /calendar/:token/feed.ics works without auth header', async () => {
      const res = await request(app.getHttpServer())
        .get(`/calendar/${urlToken}/feed.ics`)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/calendar/);
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('END:VCALENDAR');
    });

    it('E. unknown token → 404', async () => {
      await request(app.getHttpServer())
        .get('/calendar/totally-bogus-token-value-1234567890/feed.ics')
        .expect(404);
    });

    it('F. DELETE revokes; the old token then returns 404', async () => {
      await request(app.getHttpServer())
        .delete('/users/me/calendar/token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/calendar/${urlToken}/feed.ics`)
        .expect(404);
    });
  });
});
