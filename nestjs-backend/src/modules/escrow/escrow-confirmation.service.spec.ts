import {
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EscrowConfirmationService } from './escrow-confirmation.service';
import {
  PaymentEscrow,
  ConfirmationStatus,
  ConfirmationTier,
} from './payment-escrow.entity';

/**
 * Phase 2 — v2 confirmation flow unit tests.
 *
 * v2 flow (CONFIRMATION_V2_ENABLED=true):
 *   start (worker, no QR mint) → both upload before+after photos + approve
 *   → payer(customer) getQr → worker scan releases payment.
 *
 * Money flow asserted via escrowService.release call counts.
 */

const WORKER_ID = 'worker-1';
const CUSTOMER_ID = 'customer-1';
const ESCROW_ID = 'escrow-1';

// Same GPS for both sides so Haversine distance ~= 0 (within 100m radius).
const LAT = 41.0;
const LNG = 29.0;

type EscrowOverrides = Partial<PaymentEscrow>;

function makeEscrow(overrides: EscrowOverrides = {}): PaymentEscrow {
  const e = new PaymentEscrow();
  e.id = ESCROW_ID;
  e.jobId = 'job-1';
  e.offerId = 'offer-1';
  e.customerId = CUSTOMER_ID;
  e.taskerId = WORKER_ID;
  e.amount = 1000;
  e.amountMinor = 100_000; // 1000 TL — would be STANDARD; v2 ignores tiers anyway
  e.status = 'HELD' as PaymentEscrow['status'];
  e.paymentStatus = 'paid';
  e.confirmationStatus = ConfirmationStatus.AWAITING_CONFIRMATION;
  e.confirmationTier = ConfirmationTier.STANDARD;
  e.qrToken = null;
  e.qrIssuedAt = null;
  e.qrScannedAt = null;
  e.workerLat = LAT;
  e.workerLng = LNG;
  e.customerLat = LAT;
  e.customerLng = LNG;
  e.workerConfirmedAt = null;
  e.customerConfirmedAt = null;
  e.confirmationDeadline = null;
  return Object.assign(e, overrides);
}

function photo(side: 'worker' | 'customer', phase: 'before' | 'after') {
  return { side, phase } as any;
}

/** Both sides have full before+after photos. */
function fullPhotos() {
  return [
    photo('worker', 'before'),
    photo('worker', 'after'),
    photo('customer', 'before'),
    photo('customer', 'after'),
  ];
}

interface Harness {
  service: EscrowConfirmationService;
  escrowRepo: any;
  photoRepo: any;
  escrowService: any;
  notificationsService: any;
  current: PaymentEscrow;
}

/**
 * Build the service with v2 enabled and a mutable escrow that the repo returns.
 */
function buildV2(
  escrow: PaymentEscrow,
  photos: any[] = [],
): Harness {
  const current = escrow;

  const escrowRepo = {
    findOne: jest.fn(async () => current),
    save: jest.fn(async (e: PaymentEscrow) => e),
  };
  const bookingEscrowRepo = {
    findOne: jest.fn(async () => null),
    save: jest.fn(),
  };
  const photoRepo = {
    find: jest.fn(async () => photos),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => ({ id: 'photo-1', ...row })),
  };
  const videoRepo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => row),
  };
  const escrowService = {
    release: jest.fn(async () => current),
  };
  const notificationsService = {
    send: jest.fn(async () => undefined),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'CONFIRMATION_V2_ENABLED' ? 'true' : undefined,
    ),
  };

  const service = new EscrowConfirmationService(
    escrowRepo as any,
    bookingEscrowRepo as any,
    photoRepo as any,
    videoRepo as any,
    escrowService as any,
    notificationsService as any,
    config as any,
  );

  return {
    service,
    escrowRepo,
    photoRepo,
    escrowService,
    notificationsService,
    current,
  };
}

describe('EscrowConfirmationService (v2 flow)', () => {
  // 1. start(): worker-only; AWAITING_CONFIRMATION + workerLat/Lng; NO qrToken minted.
  it('start() is worker-only and does NOT mint a QR token in v2', async () => {
    const escrow = makeEscrow({
      confirmationStatus: ConfirmationStatus.NONE,
      qrToken: null,
      qrIssuedAt: null,
      workerLat: null,
      workerLng: null,
    });
    const h = buildV2(escrow);

    await h.service.start(ESCROW_ID, WORKER_ID, LAT, LNG);

    expect(escrow.confirmationStatus).toBe(
      ConfirmationStatus.AWAITING_CONFIRMATION,
    );
    expect(escrow.workerLat).toBe(LAT);
    expect(escrow.workerLng).toBe(LNG);
    expect(escrow.qrToken).toBeNull();
    expect(escrow.qrIssuedAt).toBeNull();

    // worker-only enforcement
    const escrow2 = makeEscrow({ confirmationStatus: ConfirmationStatus.NONE });
    const h2 = buildV2(escrow2);
    await expect(
      h2.service.start(ESCROW_ID, CUSTOMER_ID, LAT, LNG),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 2. approve(): first side, requires own before+after; sets confirmedAt; NO release.
  it('approve() sets workerConfirmedAt and does NOT release on first approval', async () => {
    const escrow = makeEscrow();
    const h = buildV2(escrow, fullPhotos());

    const res = await h.service.approve(ESCROW_ID, WORKER_ID);

    expect(escrow.workerConfirmedAt).toBeInstanceOf(Date);
    expect(escrow.customerConfirmedAt).toBeNull();
    expect(h.escrowService.release).not.toHaveBeenCalled();
    expect(res.bothApproved).toBe(false);
    expect(res.awaitingQr).toBe(false);
  });

  // 3. approve() second side: both confirmedAt → still NO release; awaitingQr=true.
  it('approve() second side sets both confirmedAt but still does NOT release (deferred to scan)', async () => {
    const escrow = makeEscrow({ workerConfirmedAt: new Date() });
    const h = buildV2(escrow, fullPhotos());

    const res = await h.service.approve(ESCROW_ID, CUSTOMER_ID);

    expect(escrow.customerConfirmedAt).toBeInstanceOf(Date);
    expect(escrow.workerConfirmedAt).toBeInstanceOf(Date);
    expect(h.escrowService.release).not.toHaveBeenCalled();
    expect(res.bothApproved).toBe(true);
    expect(res.awaitingQr).toBe(true);
  });

  // 4. getQr(): allowed only when both confirmedAt; CUSTOMER-only; mints token.
  it('getQr() is customer-only and mints a token only after both approvals', async () => {
    // worker forbidden
    const escrowW = makeEscrow({
      workerConfirmedAt: new Date(),
      customerConfirmedAt: new Date(),
    });
    const hW = buildV2(escrowW);
    await expect(
      hW.service.getQr(ESCROW_ID, WORKER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // both approved → customer mints token
    const escrowOk = makeEscrow({
      workerConfirmedAt: new Date(),
      customerConfirmedAt: new Date(),
    });
    const hOk = buildV2(escrowOk);
    const res = await hOk.service.getQr(ESCROW_ID, CUSTOMER_ID);
    expect(res.qrToken).toBeTruthy();
    expect(escrowOk.qrToken).toBeTruthy();

    // approvals incomplete → BadRequest
    const escrowIncomplete = makeEscrow({
      workerConfirmedAt: new Date(),
      customerConfirmedAt: null,
    });
    const hInc = buildV2(escrowIncomplete);
    await expect(
      hInc.service.getQr(ESCROW_ID, CUSTOMER_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 5. scan(): worker-only; both confirmedAt; valid token+GPS → release exactly once.
  it('scan() is worker-only and releases payment exactly once on valid token+GPS', async () => {
    // First mint a real token via customer getQr.
    const escrow = makeEscrow({
      workerConfirmedAt: new Date(),
      customerConfirmedAt: new Date(),
    });
    const h = buildV2(escrow, fullPhotos());
    const { qrToken } = await h.service.getQr(ESCROW_ID, CUSTOMER_ID);

    // customer cannot scan
    await expect(
      h.service.scan(ESCROW_ID, CUSTOMER_ID, qrToken, LAT, LNG),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.escrowService.release).not.toHaveBeenCalled();

    // worker scans → release exactly once
    const res = await h.service.scan(ESCROW_ID, WORKER_ID, qrToken, LAT, LNG);
    expect(res.released).toBe(true);
    expect(h.escrowService.release).toHaveBeenCalledTimes(1);
    expect(h.escrowService.release).toHaveBeenCalledWith(
      ESCROW_ID,
      'system',
      'qr handshake complete',
      'admin',
    );
    expect(escrow.qrScannedAt).toBeInstanceOf(Date);
  });

  // 6. scan() before both approved → BadRequestException, no release.
  it('scan() before both approvals throws and does NOT release', async () => {
    const escrow = makeEscrow({
      workerConfirmedAt: new Date(),
      customerConfirmedAt: null,
      qrToken: 'sometoken',
      qrIssuedAt: new Date(),
    });
    const h = buildV2(escrow);
    await expect(
      h.service.scan(ESCROW_ID, WORKER_ID, 'sometoken', LAT, LNG),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.escrowService.release).not.toHaveBeenCalled();
  });

  // 7. v2 hides photos: approve has NO photo requirement and succeeds with zero photos.
  it('v2 has no photo requirement — approve succeeds without any photos', async () => {
    const escrow = makeEscrow({
      amountMinor: 10_000, // 100 TL → tierFor() = LITE; v2 ignores tiers anyway
      confirmationTier: ConfirmationTier.LITE,
    });
    const h = buildV2(escrow, []); // zero photos
    const res = await h.service.approve(ESCROW_ID, WORKER_ID);
    expect(escrow.workerConfirmedAt).toBeInstanceOf(Date);
    expect(res.bothApproved).toBe(false);
    expect(h.escrowService.release).not.toHaveBeenCalled();
  });

  // 8 (Task 8). addPhoto requires gps in v2.
  it('addPhoto requires gps in v2', async () => {
    const escrow = makeEscrow();
    const h = buildV2(escrow);
    await expect(
      h.service.addPhoto({
        escrowId: ESCROW_ID,
        userId: WORKER_ID,
        phase: 'before',
        photoUrl: 'http://x/p.jpg',
        lat: null,
        lng: null,
        takenAt: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // with gps → succeeds
    const ok = await h.service.addPhoto({
      escrowId: ESCROW_ID,
      userId: WORKER_ID,
      phase: 'before',
      photoUrl: 'http://x/p.jpg',
      lat: LAT,
      lng: LNG,
      takenAt: null,
    });
    expect(ok).toBeTruthy();
  });
});
