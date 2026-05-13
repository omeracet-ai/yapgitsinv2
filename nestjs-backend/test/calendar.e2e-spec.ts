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
});
