import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 180 — Customer wallet PDF export (e2e).
 *
 *   A. GET /users/me/wallet.pdf without auth → 401.
 *   B. GET /users/me/wallet.pdf with JWT → 200, application/pdf, body starts
 *      with %PDF- magic bytes and is > 1KB.
 */
describe('Customer wallet PDF export (e2e)', () => {
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
        email: 'wallet-customer@test.com',
        phoneNumber: '5559991180',
        password: 'Test1234',
        fullName: 'Wallet Customer',
      })
      .expect(201);
    token = reg.body.access_token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('A. rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .get('/users/me/wallet.pdf')
      .expect(401);
  });

  it('B. returns application/pdf with valid PDF magic bytes', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me/wallet.pdf')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (chunk: Buffer) => data.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(data)));
      })
      .expect(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    const body: Buffer = res.body as Buffer;
    expect(body.slice(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(1024);
  });
});
