/**
 * Phase 238A — defensive guard for /reviews/user/:id, /reviews/worker/:workerId,
 * /reviews/job/:jobId. Prod was 500-ing on all three (stale schema / NULL FKs).
 *
 * ReviewsService.findByReviewee + findByJob now use minimal-column QueryBuilder
 * + LEFT JOIN + try/catch so partial schemas never blow up these endpoints.
 *
 * Verifies:
 *   - Empty DB / unknown id → 200 [].
 *   - Populated DB → 200 with reviewer+reviewee minimal projection.
 *   - Invalid UUID → 200 [] (Param('id') is plain string; no UUID pipe).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Review } from '../src/modules/reviews/review.entity';
import { User } from '../src/modules/users/user.entity';

describe('Reviews defensive read endpoints (e2e) — Phase 238A', () => {
  let app: INestApplication;
  let reviewsRepo: Repository<Review>;
  let usersRepo: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reviewsRepo = moduleFixture.get<Repository<Review>>(getRepositoryToken(Review));
    usersRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /reviews/user/:id unknown → 200 []', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/user/00000000-0000-0000-0000-000000000000')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('GET /reviews/user/:id invalid-shaped string → 200 [] (no 500)', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/user/not-a-uuid')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reviews/worker/:workerId unknown → 200 []', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/worker/00000000-0000-0000-0000-000000000000')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('GET /reviews/job/:jobId unknown → 200 []', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/job/00000000-0000-0000-0000-000000000000')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('populated → GET /reviews/user/:id returns reviewer+reviewee shape', async () => {
    const reviewer = await usersRepo.save(
      usersRepo.create({
        email: 'p238a-reviewer@test.com',
        phoneNumber: '5550000238',
        fullName: 'P238A Reviewer',
        passwordHash: 'x',
      } as Partial<User>),
    );
    const reviewee = await usersRepo.save(
      usersRepo.create({
        email: 'p238a-reviewee@test.com',
        phoneNumber: '5550000239',
        fullName: 'P238A Reviewee',
        passwordHash: 'x',
      } as Partial<User>),
    );

    // jobId left null — FK is nullable and we don't want to seed a Job here.
    const r = await reviewsRepo.save(
      reviewsRepo.create({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        jobId: null,
        rating: 5,
        comment: 'p238a review',
        createdAt: new Date('2026-05-16T11:00:00Z'),
      } as Partial<Review>),
    );

    const res = await request(app.getHttpServer())
      .get(`/reviews/user/${reviewee.id}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: r.id,
        rating: 5,
        comment: 'p238a review',
        reviewer: expect.objectContaining({
          id: reviewer.id,
          fullName: 'P238A Reviewer',
        }),
        reviewee: expect.objectContaining({
          id: reviewee.id,
          fullName: 'P238A Reviewee',
        }),
      }),
    );

    // /reviews/worker/:workerId aliases findByReviewee — same shape.
    const wres = await request(app.getHttpServer())
      .get(`/reviews/worker/${reviewee.id}`)
      .expect(200);
    expect(wres.body.length).toBeGreaterThanOrEqual(1);
    expect(wres.body[0].id).toBe(r.id);

    // /reviews/job/:jobId — unknown job → still 200 [] (defensive).
    const jres = await request(app.getHttpServer())
      .get(`/reviews/job/22222222-2222-2222-2222-222222222222`)
      .expect(200);
    expect(Array.isArray(jres.body)).toBe(true);
  });
});
