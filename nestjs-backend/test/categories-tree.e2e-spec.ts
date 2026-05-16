/**
 * Phase 238B — GET /categories/tree route ordering regression.
 *
 * Prod was 404'leyince ("Kategori bulunamadı: tree") çünkü controller'da
 * @Get(':id') decorator'u @Get('tree')'den önce gelirse Nest "tree" stringini
 * id parametresi olarak yorumluyor. Bu suite literal route'un ÖNCE eşleştiğini,
 * tree shape'inin grup hiyerarşisini döndürdüğünü, ve geçersiz id'nin hala
 * 404 verdiğini doğrular.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Categories /tree (e2e) — Phase 238B', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /categories/tree → 200, grup bazlı hiyerarşi', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories/tree')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Seed data garantili olduğu için en az 1 grup olmalı.
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toEqual(
      expect.objectContaining({
        group: expect.any(String),
        children: expect.any(Array),
      }),
    );
    expect(first.children.length).toBeGreaterThan(0);
    expect(first.children[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );
  });

  it('GET /categories/search?q=boya → 200 (literal route hala çalışıyor)', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories/search?q=boya')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /categories/not-a-real-id → 404 (param route fallback)', async () => {
    await request(app.getHttpServer())
      .get('/categories/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
