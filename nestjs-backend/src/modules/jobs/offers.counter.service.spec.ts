import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { Offer, OfferStatus } from './offer.entity';
import { Job } from './job.entity';
import { OFFER_COUNTER_TOKEN_COST } from '../tokens/tokens.service';

/**
 * Phase 262 — Counter (pazarlık) aksiyonları, her iki marketplace yönü için.
 *
 * Kapsam:
 *  - counter() leaf-aware: re-counter zincirin son halkasına eklenir.
 *  - Kredi kuralı: TEKLİF VEREN taraf (job.customerId değil) re-counter'da yarı kredi öder;
 *    ilan sahibi bedava. (request: usta öder; offer: müşteri öder — simetrik.)
 *  - acceptCounter(): karşı tarafın son teklifini, anlaşılan fiyatla KÖK offer üzerinden
 *    kabul eder; mevcut accept() booking/escrow'u tetikler. Kendi teklifini kabul edemezsin.
 */

const CUSTOMER = 'customer-1'; // request akışında ilan sahibi (job.customerId)
const WORKER = 'worker-1'; // request akışında teklif veren (root.userId)

function makeOffer(p: Partial<Offer>): Offer {
  return {
    id: p.id!,
    jobId: p.jobId ?? 'job-1',
    userId: p.userId!,
    price: p.price ?? 0,
    priceMinor: p.priceMinor ?? 0,
    message: p.message ?? null,
    status: p.status ?? OfferStatus.PENDING,
    counterPrice: p.counterPrice ?? null,
    counterPriceMinor: p.counterPriceMinor ?? null,
    counterMessage: p.counterMessage ?? null,
    parentOfferId: p.parentOfferId ?? null,
    negotiationRound: p.negotiationRound ?? 0,
    lineItems: p.lineItems ?? null,
  } as Offer;
}

interface Harness {
  service: OffersService;
  offers: Offer[];
  spend: jest.Mock;
  escrowHold: jest.Mock;
  bookingSave: jest.Mock;
  isSubscriber: jest.Mock;
}

function build(offers: Offer[], job: any): Harness {
  let seq = offers.length;

  const findOneImpl = ({ where, order }: any) => {
    if (where.id) return offers.find((o) => o.id === where.id) ?? null;
    if ('parentOfferId' in where) {
      let matches = offers.filter(
        (o) => o.parentOfferId === where.parentOfferId,
      );
      if (order?.negotiationRound === 'DESC') {
        matches = matches.sort(
          (a, b) => (b.negotiationRound ?? 0) - (a.negotiationRound ?? 0),
        );
      }
      return matches[0] ?? null;
    }
    return null;
  };
  const saveImpl = (row: any) => {
    if (!row.id) row.id = `gen-${++seq}`;
    const idx = offers.findIndex((o) => o.id === row.id);
    if (idx >= 0) offers[idx] = row;
    else offers.push(row);
    return row;
  };

  const offersRepo = {
    findOne: jest.fn(async (opts: any) => findOneImpl(opts)),
    create: jest.fn((row: any) => ({ ...row })),
    save: jest.fn(async (row: any) => saveImpl(row)),
    find: jest.fn(async () => offers),
    // Phase 262 — accept() atomik claim: UPDATE ... WHERE id AND status != accepted
    createQueryBuilder: jest.fn(() => {
      let _set: any = {};
      let _params: any = {};
      const qb: any = {
        update: () => qb,
        set: (v: any) => {
          _set = v;
          return qb;
        },
        where: (_cond: string, params: any) => {
          _params = params;
          return qb;
        },
        execute: async () => {
          const o = offers.find((x) => x.id === _params.id);
          if (!o || o.status === _params.accepted) return { affected: 0 };
          Object.assign(o, _set);
          return { affected: 1 };
        },
      };
      return qb;
    }),
  };

  // withdrawOffer dataSource.transaction(manager => ...) için minimal manager.
  const manager = {
    findOne: jest.fn(async (_entity: any, opts: any) => {
      if (_entity === Job) return job;
      return findOneImpl(opts);
    }),
    save: jest.fn(async (_entity: any, row: any) =>
      _entity === Offer ? saveImpl(row) : row,
    ),
    increment: jest.fn(async () => undefined),
    create: jest.fn((_entity: any, row: any) => row),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: any) => cb(manager)),
  };

  const spend = jest.fn(async () => undefined);
  const escrowHold = jest.fn(async () => undefined);
  const bookingSave = jest.fn(async (row: any) => row);
  const isSubscriber = jest.fn(async () => false);

  const jobsRepo = {
    findOne: jest.fn(async () => job),
    update: jest.fn(async () => undefined),
  };
  const bookingsRepo = {
    create: jest.fn((row: any) => row),
    save: bookingSave,
  };

  const service = new OffersService(
    offersRepo as any,
    jobsRepo as any,
    bookingsRepo as any,
    { spend } as any, // tokensService
    { bumpStat: jest.fn(async () => undefined) } as any, // usersService
    { send: jest.fn(async () => undefined) } as any, // notificationsService
    { hold: escrowHold } as any, // escrowService
    { listBlockedIds: jest.fn(async () => []) } as any, // userBlocksService
    { isActiveSubscriber: isSubscriber } as any, // subscriptionsService
    dataSource as any, // dataSource
    { createAcceptanceWelcome: jest.fn(async () => undefined) } as any, // chatService (Phase 401)
  );

  return { service, offers, spend, escrowHold, bookingSave, isSubscriber };
}

describe('OffersService — Phase 262 counter & acceptCounter', () => {
  const job = { id: 'job-1', customerId: CUSTOMER, title: 'Salon Badana', status: 'open', category: 'Boya' };

  it('ilan sahibi counter yaparsa kredi KESİLMEZ', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950 });
    const h = build([root], job);

    await h.service.counter('o1', CUSTOMER, 1600, 'olur mu');

    expect(h.spend).not.toHaveBeenCalled();
    // leaf (o1) countered + counter alanları + yeni pending child
    expect(h.offers.find((o) => o.id === 'o1')!.status).toBe(OfferStatus.COUNTERED);
    const child = h.offers.find((o) => o.parentOfferId === 'o1');
    expect(child).toBeDefined();
    expect(child!.userId).toBe(CUSTOMER);
    expect(child!.price).toBe(1600);
    expect(child!.status).toBe(OfferStatus.PENDING);
    expect(child!.negotiationRound).toBe(1);
  });

  it('teklif veren taraf re-counter yaparsa YARIM kredi keser ve zincirin LEAF\'ine ekler', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED, counterPrice: 1600 });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, parentOfferId: 'o1', negotiationRound: 1 });
    const h = build([root, c1], job);

    await h.service.counter('o1', WORKER, 1800, 'son fiyat');

    expect(h.spend).toHaveBeenCalledTimes(1);
    expect(h.spend).toHaveBeenCalledWith(WORKER, OFFER_COUNTER_TOKEN_COST, expect.any(String));
    // leaf = c1 → countered; yeni child c1'e bağlı round 2
    expect(h.offers.find((o) => o.id === 'c1')!.status).toBe(OfferStatus.COUNTERED);
    const round2 = h.offers.find((o) => o.parentOfferId === 'c1');
    expect(round2).toBeDefined();
    expect(round2!.userId).toBe(WORKER);
    expect(round2!.negotiationRound).toBe(2);
    // kök senkronlandı
    expect(h.offers.find((o) => o.id === 'o1')!.counterPrice).toBe(1800);
  });

  it('abone teklif veren re-counter\'da kredi ÖDEMEZ', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, parentOfferId: 'o1', negotiationRound: 1 });
    const h = build([root, c1], job);
    h.isSubscriber.mockResolvedValue(true);

    await h.service.counter('o1', WORKER, 1800, 'son');

    expect(h.spend).not.toHaveBeenCalled();
  });

  it('acceptCounter() leaf fiyatını KÖK offer\'a yazar, accept() booking/escrow tetikler', async () => {
    // Müşteri 1600\'e countered yaptı; usta bunu kabul ediyor.
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED, counterPrice: 1600 });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, parentOfferId: 'o1', negotiationRound: 1 });
    const h = build([root, c1], job);

    const result = await h.service.acceptCounter('o1', WORKER);

    expect(result.status).toBe(OfferStatus.ACCEPTED);
    expect(result.price).toBe(1600); // anlaşılan (leaf) fiyat köke yazıldı
    expect(h.offers.find((o) => o.id === 'c1')!.status).toBe(OfferStatus.REJECTED);
    // escrow + booking anlaşılan fiyatla
    expect(h.escrowHold).toHaveBeenCalledWith(expect.objectContaining({ amount: 1600 }));
    expect(h.bookingSave).toHaveBeenCalledWith(expect.objectContaining({ agreedPrice: 1600 }));
  });

  it('acceptCounter() DÜZ pending teklifi (karşı teklif yokken) normal kabul gibi çalışır', async () => {
    // En çok kullanılan yol: ilan sahibi, gelen ilk teklifi kabul eder (counter yok).
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.PENDING });
    const h = build([root], job);

    const result = await h.service.acceptCounter('o1', CUSTOMER);

    expect(result.status).toBe(OfferStatus.ACCEPTED);
    expect(result.price).toBe(1950); // orijinal fiyat korunur
    expect(h.escrowHold).toHaveBeenCalledWith(expect.objectContaining({ amount: 1950 }));
    expect(h.bookingSave).toHaveBeenCalledWith(expect.objectContaining({ agreedPrice: 1950 }));
  });

  it('acceptCounter() ikinci çağrıda (çift-tık) çift booking YAPMAZ', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.PENDING });
    const h = build([root], job);

    await h.service.acceptCounter('o1', CUSTOMER);
    await expect(h.service.acceptCounter('o1', CUSTOMER)).rejects.toBeInstanceOf(BadRequestException);
    expect(h.bookingSave).toHaveBeenCalledTimes(1);
  });

  it('acceptCounter() kendi teklifini kabul etmeyi reddeder', async () => {
    // Usta son turu attı (leaf userId = WORKER); yine usta kabul etmeye çalışıyor.
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, status: OfferStatus.COUNTERED, parentOfferId: 'o1', negotiationRound: 1 });
    const c2 = makeOffer({ id: 'c2', userId: WORKER, price: 1800, parentOfferId: 'c1', negotiationRound: 2 });
    const h = build([root, c1, c2], job);

    await expect(h.service.acceptCounter('o1', WORKER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acceptCounter() pazarlığa taraf olmayan üçüncü şahsı reddeder (Forbidden)', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, parentOfferId: 'o1', negotiationRound: 1 });
    const h = build([root, c1], job);

    await expect(h.service.acceptCounter('o1', 'stranger-99')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('withdrawOffer kökü geri çekince zincirin açık child halkalarını da kapatır (#1)', async () => {
    const root = makeOffer({ id: 'o1', userId: WORKER, price: 1950, status: OfferStatus.COUNTERED });
    const c1 = makeOffer({ id: 'c1', userId: CUSTOMER, price: 1600, status: OfferStatus.PENDING, parentOfferId: 'o1', negotiationRound: 1 });
    const h = build([root, c1], job);

    await h.service.withdrawOffer('job-1', 'o1', WORKER);

    expect(h.offers.find((o) => o.id === 'o1')!.status).toBe(OfferStatus.WITHDRAWN);
    // dangling PENDING child de kapatıldı → acceptCounter ile diriltilemez
    expect(h.offers.find((o) => o.id === 'c1')!.status).toBe(OfferStatus.WITHDRAWN);
  });
});
