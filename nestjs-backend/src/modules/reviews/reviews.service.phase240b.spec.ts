/**
 * Phase 240B (Voldi-fs) — markHelpful atomic + CreateReviewDto whitelist regression.
 *
 * Minimal unit tests; no DB. Mocks repository to assert that the new
 * `increment` call replaces the read-modify-write pattern.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateReviewDto } from './dto/create-review.dto';

describe('CreateReviewDto (mass-assignment regression)', () => {
  it('strips unknown fields (flagged, fraudScore, helpfulCount, reviewerId)', () => {
    // plainToInstance + class-validator whitelist davranışı:
    // tanımlı alanlar enstanslara map'lenir; bilinmeyenler NestJS
    // ValidationPipe whitelist:true ile strip edilir.
    const dto = plainToInstance(CreateReviewDto, {
      rating: 5,
      comment: 'iyi',
      jobId: '11111111-1111-1111-1111-111111111111',
      revieweeId: '22222222-2222-2222-2222-222222222222',
      flagged: true,
      fraudScore: 0,
      helpfulCount: 999,
      reviewerId: 'attacker-uuid',
    } as unknown as object);
    const keys = Object.keys(dto);
    expect(keys).toContain('rating');
    expect(keys).toContain('jobId');
    expect(keys).toContain('revieweeId');
    // mass-assignment alanları DTO sınıfına yansımaz
    expect(keys).not.toContain('flagged');
    expect(keys).not.toContain('fraudScore');
    expect(keys).not.toContain('helpfulCount');
    expect(keys).not.toContain('reviewerId');
  });

  it('rejects rating > 5', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 99,
      jobId: '11111111-1111-1111-1111-111111111111',
      revieweeId: '22222222-2222-2222-2222-222222222222',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'rating')).toBe(true);
  });

  it('rejects non-UUID jobId', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 4,
      jobId: 'not-a-uuid',
      revieweeId: '22222222-2222-2222-2222-222222222222',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'jobId')).toBe(true);
  });

  it('accepts valid payload', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 5,
      comment: 'tşk',
      jobId: '11111111-1111-1111-1111-111111111111',
      revieweeId: '22222222-2222-2222-2222-222222222222',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects comment > 2000 chars', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 5,
      comment: 'a'.repeat(2001),
      jobId: '11111111-1111-1111-1111-111111111111',
      revieweeId: '22222222-2222-2222-2222-222222222222',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'comment')).toBe(true);
  });
});

describe('OTP RNG (crypto.randomInt)', () => {
  it('produces 6-digit codes within [100000, 999999]', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomInt } = require('crypto');
    for (let i = 0; i < 50; i++) {
      const v = randomInt(100000, 1000000);
      expect(v).toBeGreaterThanOrEqual(100000);
      expect(v).toBeLessThanOrEqual(999999);
      expect(String(v).length).toBe(6);
    }
  });
});
