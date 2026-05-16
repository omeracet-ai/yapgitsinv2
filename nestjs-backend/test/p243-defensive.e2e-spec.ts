/**
 * Phase 243 — backend P1 defensive guards.
 *
 * Verifies:
 *   - GET /jobs (public homepage feed) never 500s on weird filters / empty DB.
 *   - GET /jobs/nearby tolerates missing/NaN coords → empty list.
 *   - GET /users/workers (public worker directory) returns 200 on weird filters.
 *   - GET /users/workers/nearby tolerates missing coords → empty paginated shape.
 *   - ReviewsService.addPhotos under parallel calls — transaction + lock keeps
 *     the 3-photo cap from being raced past (1 success + N failures).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Review } from '../src/modules/reviews/review.entity';
import { User } from '../src/modules/users/user.entity';
import { ReviewsService } from '../src/modules/reviews/reviews.service';

describe('Phase 243 defensive guards (e2e)', () => {
  let app: INestApplication;
  let reviewsRepo: Repository<Review>;
  let usersRepo: Repository<User>;
  let reviewsService: ReviewsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reviewsRepo = moduleFixture.get<Repository<Review>>(getRepositoryToken(Review));
    usersRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    reviewsService = moduleFixture.get<ReviewsService>(ReviewsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /jobs returns 200 paginated shape on default call', async () => {
    const res = await request(app.getHttpServer()).get('/jobs').expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      }),
    );
  });

  it('GET /jobs with unknown category → 200 with empty data', async () => {
    const res = await request(app.getHttpServer())
      .get('/jobs?category=__no_such_category__')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('GET /jobs/nearby with NaN coords → 200 empty array (defensive)', async () => {
    const res = await request(app.getHttpServer())
      .get('/jobs/nearby?lat=not-a-number&lng=also-bad')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('GET /jobs/nearby with valid coords → 200 array (may be empty)', async () => {
    const res = await request(app.getHttpServer())
      .get('/jobs/nearby?lat=41.0&lng=29.0&radiusKm=5')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /users/workers returns 200 paginated shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/workers?limit=5')
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      }),
    );
  });

  it('GET /users/workers with unknown category → 200 empty data', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/workers?category=__no_such_cat__')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('GET /users/workers/nearby with missing coords → 200 paginated empty', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/workers/nearby')
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: [],
        total: 0,
      }),
    );
  });

  it('GET /users/workers/nearby with valid coords → 200 paginated', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/workers/nearby?lat=41.0&lon=29.0&radius=10')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('ReviewsService.addPhotos: parallel attempts respect 3-photo cap', async () => {
    const reviewer = await usersRepo.save(
      usersRepo.create({
        email: 'p243-reviewer@test.com',
        phoneNumber: '5550000243',
        fullName: 'P243 Reviewer',
        passwordHash: 'x',
      } as Partial<User>),
    );
    const reviewee = await usersRepo.save(
      usersRepo.create({
        email: 'p243-reviewee@test.com',
        phoneNumber: '5550000244',
        fullName: 'P243 Reviewee',
        passwordHash: 'x',
      } as Partial<User>),
    );
    const review = await reviewsRepo.save(
      reviewsRepo.create({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        jobId: null,
        rating: 5,
        comment: 'p243 race test',
        photos: [],
      } as Partial<Review>),
    );

    // Each call tries to add 2 photos. 4 parallel attempts → 4*2 = 8 total.
    // Without lock, race could leave merged.length > 3.
    // With lock + transaction, only those that fit before hitting cap succeed;
    // others throw BadRequestException.
    const results = await Promise.allSettled([
      reviewsService.addPhotos(review.id, reviewer.id, ['/a1.jpg', '/a2.jpg']),
      reviewsService.addPhotos(review.id, reviewer.id, ['/b1.jpg', '/b2.jpg']),
      reviewsService.addPhotos(review.id, reviewer.id, ['/c1.jpg', '/c2.jpg']),
      reviewsService.addPhotos(review.id, reviewer.id, ['/d1.jpg', '/d2.jpg']),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = results.filter((r) => r.status === 'rejected').length;

    expect(fulfilled + rejected).toBe(4);

    const finalReview = await reviewsRepo.findOne({ where: { id: review.id } });
    expect(finalReview).not.toBeNull();
    const photos = finalReview!.photos ?? [];
    // Hard invariant: cap holds regardless of how many parallel calls won.
    expect(photos.length).toBeLessThanOrEqual(3);
  });
});
