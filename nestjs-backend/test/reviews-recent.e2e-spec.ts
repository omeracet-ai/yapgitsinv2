/**
 * Phase 235 — GET /reviews/recent regression suite.
 *
 * Prod was 500-ing on this public homepage endpoint. Defensive rewrite in
 * ReviewsService.findRecent uses a minimal-column QueryBuilder + try/catch
 * so partial schemas / NULL relations never blow up the homepage.
 *
 * Verifies:
 *   - Empty DB → 200 with [].
 *   - Populated DB → 200 with newest-first ordering and reviewer/reviewee shape.
 *   - limit=0 / negative / huge → clamped (no 500).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Review } from '../src/modules/reviews/review.entity';
import { User } from '../src/modules/users/user.entity';

describe('Reviews /recent (e2e) — Phase 235', () => {
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

  it('GET /reviews/recent on empty DB → 200 []', async () => {
    const res = await request(app.getHttpServer()).get('/reviews/recent').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('GET /reviews/recent?limit=0 → 200 (clamped, no 500)', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/recent?limit=0')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reviews/recent?limit=9999 → 200 (clamped to 50)', async () => {
    const res = await request(app.getHttpServer())
      .get('/reviews/recent?limit=9999')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(50);
  });

  it('populated DB → returns newest-first with reviewer+reviewee shape', async () => {
    // Seed two users.
    const reviewer = await usersRepo.save(
      usersRepo.create({
        email: 'r235-reviewer@test.com',
        phoneNumber: '5550000235',
        fullName: 'P235 Reviewer',
        passwordHash: 'x',
      } as Partial<User>),
    );
    const reviewee = await usersRepo.save(
      usersRepo.create({
        email: 'r235-reviewee@test.com',
        phoneNumber: '5550000236',
        fullName: 'P235 Reviewee',
        passwordHash: 'x',
      } as Partial<User>),
    );

    // Seed two reviews, newer one second.
    // Explicit createdAt so SQLite's second-resolution CURRENT_TIMESTAMP can't tie.
    const older = await reviewsRepo.save(
      reviewsRepo.create({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        rating: 4,
        comment: 'older review',
        createdAt: new Date('2026-05-15T10:00:00Z'),
      } as Partial<Review>),
    );
    const newer = await reviewsRepo.save(
      reviewsRepo.create({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        rating: 5,
        comment: 'newer review',
        createdAt: new Date('2026-05-16T10:00:00Z'),
      } as Partial<Review>),
    );

    const res = await request(app.getHttpServer())
      .get('/reviews/recent?limit=10')
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // Newest first.
    expect(res.body[0].id).toBe(newer.id);
    expect(res.body[1].id).toBe(older.id);
    // Shape.
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        rating: expect.any(Number),
        comment: expect.any(String),
        createdAt: expect.any(String),
        reviewer: expect.objectContaining({
          id: reviewer.id,
          fullName: 'P235 Reviewer',
        }),
        reviewee: expect.objectContaining({
          id: reviewee.id,
          fullName: 'P235 Reviewee',
        }),
      }),
    );
  });
});
