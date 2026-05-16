/**
 * Phase 245 (Voldi-sec) — jobs.boost atomic transaction e2e.
 *
 * Eski pattern: tokensService.spend() + jobsRepository.save() ayrı işlemler;
 * spend başarılı, save fail → token kaybı.
 *
 * Yeni pattern: dataSource.transaction içinde
 *   1. atomic conditional decrement (User.tokenBalance)
 *   2. TokenTransaction log
 *   3. job.featuredOrder + featuredUntil UPDATE
 * Save fail → tüm transaction rollback → token iade.
 *
 * Cases:
 *   1. Geçersiz days (5) → 400, hiçbir yan etki yok.
 *   2. Yetersiz token → BadRequestException, balance unchanged.
 *   3. Başarılı boost(3) → balance 30 azalır, job.featuredOrder set, featuredUntil dolu.
 *   4. Job sahibi olmayan kullanıcı → ForbiddenException, balance unchanged.
 *   5. job.save() patlatıldığında (mock) → balance rollback, TokenTransaction yok.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { Job, JobStatus } from '../src/modules/jobs/job.entity';
import { User } from '../src/modules/users/user.entity';
import {
  TokenTransaction,
  TxType,
} from '../src/modules/tokens/token-transaction.entity';

describe('Jobs boost atomicity (e2e — Phase 245)', () => {
  let app: INestApplication;
  let jobsService: JobsService;
  let jobRepo: Repository<Job>;
  let userRepo: Repository<User>;
  let txRepo: Repository<TokenTransaction>;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    jobsService = app.get(JobsService);
    jobRepo = app.get(getRepositoryToken(Job));
    userRepo = app.get(getRepositoryToken(User));
    txRepo = app.get(getRepositoryToken(TokenTransaction));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function freshUser(balance: number, suffix: string): Promise<User> {
    return userRepo.save(
      userRepo.create({
        email: `boost-${suffix}-${Date.now()}@test.com`,
        phoneNumber: `5554${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(6, '0')}`,
        fullName: `Boost User ${suffix}`,
        tokenBalance: balance,
      } as Partial<User>),
    );
  }

  async function freshJob(userId: string, suffix: string): Promise<Job> {
    return jobRepo.save(
      jobRepo.create({
        title: `Boost Job ${suffix}`,
        description: 'Phase 245 atomicity test',
        category: 'Test',
        location: 'Istanbul',
        budgetMin: 100,
        budgetMax: 200,
        status: JobStatus.OPEN,
        customerId: userId,
      } as Partial<Job>),
    );
  }

  it('1. Geçersiz days (5) → 400, balance unchanged', async () => {
    const u = await freshUser(100, 'invalid-days');
    const j = await freshJob(u.id, 'invalid-days');
    await expect(jobsService.boost(j.id, 5, u.id)).rejects.toThrow();
    const after = await userRepo.findOne({ where: { id: u.id } });
    expect(after?.tokenBalance).toBe(100);
  });

  it('2. Yetersiz token → BadRequestException, balance unchanged', async () => {
    const u = await freshUser(5, 'low-balance'); // 5 < 30 (3 gün × 10)
    const j = await freshJob(u.id, 'low-balance');
    await expect(jobsService.boost(j.id, 3, u.id)).rejects.toThrow(
      /Yetersiz token/,
    );
    const after = await userRepo.findOne({ where: { id: u.id } });
    expect(after?.tokenBalance).toBe(5);
    // Hiç tx log yazılmamış olmalı (transaction rollback).
    const txs = await txRepo.find({ where: { userId: u.id } });
    expect(txs.filter((t) => t.type === TxType.SPEND)).toHaveLength(0);
  });

  it('3. Başarılı boost(3) → balance -30, featuredOrder set, TokenTransaction log', async () => {
    const u = await freshUser(100, 'happy-path');
    const j = await freshJob(u.id, 'happy-path');
    const boosted = await jobsService.boost(j.id, 3, u.id);

    expect(boosted.featuredOrder).toBeGreaterThanOrEqual(1);
    expect(boosted.featuredUntil).toBeDefined();

    const after = await userRepo.findOne({ where: { id: u.id } });
    expect(after?.tokenBalance).toBe(70); // 100 - (3 × 10)

    const spends = await txRepo.find({
      where: { userId: u.id, type: TxType.SPEND },
    });
    expect(spends).toHaveLength(1);
    expect(spends[0].amount).toBe(30);
    expect(spends[0].description).toMatch(/3 gün/);
  });

  it('4. Job sahibi olmayan kullanıcı → ForbiddenException, balance unchanged', async () => {
    const owner = await freshUser(100, 'owner');
    const intruder = await freshUser(100, 'intruder');
    const j = await freshJob(owner.id, 'forbidden');

    await expect(jobsService.boost(j.id, 3, intruder.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const afterIntruder = await userRepo.findOne({ where: { id: intruder.id } });
    expect(afterIntruder?.tokenBalance).toBe(100); // rollback: token alınmadı
    const afterOwner = await userRepo.findOne({ where: { id: owner.id } });
    expect(afterOwner?.tokenBalance).toBe(100);
  });

  it('5. job.save() fail → balance rollback, TokenTransaction yok', async () => {
    const u = await freshUser(100, 'save-fail');
    const j = await freshJob(u.id, 'save-fail');

    // dataSource.manager.save spy: Job save'i bir kez patlat.
    // Inline manager.save(Job, job) çağrısını araya gir. En basit yol:
    // jobsRepository.save'i değil — transaction içindeki manager.save'i
    // mock'lamak için DataSource.transaction'ı sarmalayalım.
    const dataSource = jobsService['dataSource'];
    const origTransaction = dataSource.transaction.bind(dataSource);
    let attempted = false;

    const spy = jest
      .spyOn(dataSource, 'transaction')
      .mockImplementation(async (...args: any[]) => {
        // origTransaction'ı çağır ama manager.save(Job, ...) için fail enjekte et.
        return origTransaction(async (manager: any) => {
          const origSave = manager.save.bind(manager);
          manager.save = (...sArgs: any[]) => {
            const arg0 = sArgs[0];
            // Job class veya Job instance → patlat
            const isJobTarget =
              arg0 === Job ||
              (arg0 && arg0.constructor && arg0.constructor.name === 'Job') ||
              (typeof arg0 === 'function' && arg0.name === 'Job');
            if (isJobTarget && !attempted) {
              attempted = true;
              throw new Error('Simulated job.save failure');
            }
            return origSave(...sArgs);
          };
          // args[0] callback'tir
          return (args[0] as any)(manager);
        });
      });

    await expect(jobsService.boost(j.id, 3, u.id)).rejects.toThrow(
      /Simulated job\.save failure/,
    );

    spy.mockRestore();

    const after = await userRepo.findOne({ where: { id: u.id } });
    expect(after?.tokenBalance).toBe(100); // ROLLBACK: token iade
    const spends = await txRepo.find({
      where: { userId: u.id, type: TxType.SPEND },
    });
    expect(spends).toHaveLength(0); // ROLLBACK: tx log yazılmadı
    const jobAfter = await jobRepo.findOne({ where: { id: j.id } });
    expect(jobAfter?.featuredOrder ?? null).toBeNull(); // ROLLBACK: boost uygulanmadı
  });
});
