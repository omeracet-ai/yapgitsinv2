import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  PaymentEscrow,
  ConfirmationStatus,
  ConfirmationTier,
} from './payment-escrow.entity';
import { BookingEscrow } from './booking-escrow.entity';
import { EscrowService } from './escrow.service';
import {
  EscrowConfirmationPhoto,
  ConfirmationSide,
  ConfirmationPhase,
} from './escrow-confirmation-photo.entity';
import { EscrowConfirmationVideo } from './escrow-confirmation-video.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { Booking } from '../bookings/booking.entity';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

// Phase 271 — payload shape for "İşlerim → Bekleyen Onaylar".
export interface PendingConfirmationRow {
  escrowId: string;
  bookingId: string;
  jobId: string | null;
  jobTitle: string | null;
  counterparty: {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
  };
  amount: number;
  confirmationStatus: ConfirmationStatus;
  graceEndsAt: string | null;
  mySide: ConfirmationSide;
  myConfirmed: boolean;
}

const QR_TTL_MS = 5 * 60 * 1000; // 5 min QR validity
// Phase 267 — defaults migrated to PlatformSettingsService (admin-tunable).
// These remain as fallback constants used only if settings lookup fails.
const DEFAULT_CONFIRMATION_DEADLINE_MS = 72 * 60 * 60 * 1000;
const DEFAULT_GPS_MATCH_RADIUS_M = 1000;

export interface TierRequirements {
  photosPerPhase: number;
  videoRequired: boolean;
  gpsMatchRequired: boolean;
}

export interface ConfirmationStateResponse {
  escrowId: string;
  confirmationStatus: ConfirmationStatus;
  tier: ConfirmationTier | null;
  requirements: TierRequirements;
  qrIssuedAt: Date | null;
  qrScannedAt: Date | null;
  confirmationDeadline: Date | null;
  // Phase 267 — exposed for plain-confirm + grace flow.
  graceEndsAt: Date | null;
  workerLat: number | null;
  workerLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  workerConfirmedAt: Date | null;
  customerConfirmedAt: Date | null;
  photos: EscrowConfirmationPhoto[];
  videoUrl: string | null;
  allConditionsMetWorker: boolean;
  allConditionsMetCustomer: boolean;
}

export interface ConfirmationStartResponse {
  // v2: QR is not minted at start (payer mints it after both approvals), so
  // these are null in the v2 branch and non-null in the legacy branch.
  qrToken: string | null;
  qrIssuedAt: Date | null;
  expiresAt: Date | null;
  tier: ConfirmationTier;
  requirements: TierRequirements;
  confirmationDeadline: Date;
}

function tierFor(amountMinor: number): ConfirmationTier {
  if (amountMinor < 50_000) return ConfirmationTier.LITE;
  if (amountMinor < 500_000) return ConfirmationTier.STANDARD;
  return ConfirmationTier.PREMIUM;
}

// v2: photos hidden — confirmation is approve (both sides) + QR handshake only.
// GPS is still enforced at the worker's QR scan (scanV2), not at approve.
const STANDARD_REQUIREMENTS: TierRequirements = {
  photosPerPhase: 0,
  videoRequired: false,
  gpsMatchRequired: true,
};

function requirementsFor(tier: ConfirmationTier): TierRequirements {
  if (tier === ConfirmationTier.LITE) {
    return { photosPerPhase: 0, videoRequired: false, gpsMatchRequired: false };
  }
  // standard + premium — same hard requirements (premium video is optional)
  return { photosPerPhase: 1, videoRequired: false, gpsMatchRequired: true };
}

/** Haversine in meters between two lat/lng pairs. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function qrSecret(): string {
  return (
    process.env.CONFIRMATION_QR_SECRET ||
    process.env.JWT_SECRET ||
    'dev-fallback-confirmation-secret'
  );
}

function mintQrToken(escrowId: string, issuedAtMs: number): string {
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${escrowId}|${issuedAtMs}|${nonce}`;
  const hmac = crypto
    .createHmac('sha256', qrSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 24);
  // Base token contains payload + signature so server can re-verify HMAC.
  // NOT: Eskiden .slice(0, 64) ile base64'ü kesiyorduk, decode edince payload
  // yarım gelip HMAC roundtrip kırılıyordu. QR string artık tam base64url
  // (~120 char) — QR kodu için yeterince kısa, validation güvenilir.
  const raw = `${payload}.${hmac}`;
  return Buffer.from(raw).toString('base64url');
}

function verifyQrToken(token: string, expectedEscrowId: string): boolean {
  try {
    // Reconstruct: we only have the truncated base64url; decode and re-derive HMAC.
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot < 0) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const [escrowId] = payload.split('|');
    if (escrowId !== expectedEscrowId) return false;
    const expected = crypto
      .createHmac('sha256', qrSecret())
      .update(payload)
      .digest('hex')
      .slice(0, 24);
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch {
    return false;
  }
}

@Injectable()
export class EscrowConfirmationService {
  private readonly logger = new Logger(EscrowConfirmationService.name);

  constructor(
    @InjectRepository(PaymentEscrow)
    private readonly escrowRepo: Repository<PaymentEscrow>,
    @InjectRepository(BookingEscrow)
    private readonly bookingEscrowRepo: Repository<BookingEscrow>,
    @InjectRepository(EscrowConfirmationPhoto)
    private readonly photoRepo: Repository<EscrowConfirmationPhoto>,
    @InjectRepository(EscrowConfirmationVideo)
    private readonly videoRepo: Repository<EscrowConfirmationVideo>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly escrowService: EscrowService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  // ------------- Phase 271 — İşlerim "Bekleyen Onaylar" -------------

  /**
   * Returns escrow rows where the user is a party AND the confirmation is in
   * a state that requires the user's attention (awaiting_confirmation or
   * pending_grace). Sorted: pending_grace first (time-sensitive), then
   * awaiting_confirmation.
   *
   * Only BookingEscrow is queried — Phase 267 confirm-plain flow lives there.
   * The legacy PaymentEscrow path is excluded by design (no booking context to
   * surface in "İşlerim").
   */
  async listMyPending(userId: string): Promise<PendingConfirmationRow[]> {
    const rows = await this.bookingEscrowRepo
      .createQueryBuilder('e')
      .where('(e.customerId = :uid OR e.workerId = :uid)', { uid: userId })
      .andWhere('e.confirmationStatus IN (:...statuses)', {
        statuses: [
          ConfirmationStatus.AWAITING_CONFIRMATION,
          ConfirmationStatus.PENDING_GRACE,
        ],
      })
      .getMany();

    if (rows.length === 0) return [];

    const bookingIds = Array.from(new Set(rows.map((r) => r.bookingId)));
    const bookings = await this.bookingRepo.find({
      where: { id: In(bookingIds) },
    });
    const bookingById = new Map(bookings.map((b) => [b.id, b]));

    const jobIds = Array.from(
      new Set(
        bookings
          .map((b) => b.jobId)
          .filter((x): x is string => typeof x === 'string' && x.length > 0),
      ),
    );
    const jobs =
      jobIds.length > 0
        ? await this.jobRepo.find({ where: { id: In(jobIds) } })
        : [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));

    const counterpartyIds = Array.from(
      new Set(
        rows.map((r) => (r.customerId === userId ? r.workerId : r.customerId)),
      ),
    );
    const users = await this.userRepo.find({
      where: { id: In(counterpartyIds) },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const mapped: PendingConfirmationRow[] = rows.map((r) => {
      const mySide: ConfirmationSide =
        r.customerId === userId ? 'customer' : 'worker';
      const counterpartyId =
        mySide === 'customer' ? r.workerId : r.customerId;
      const cp = userById.get(counterpartyId);
      const booking = bookingById.get(r.bookingId);
      const job = booking?.jobId ? jobById.get(booking.jobId) : null;
      const myConfirmed =
        mySide === 'customer'
          ? !!r.customerConfirmedAt
          : !!r.workerConfirmedAt;
      // Amount: prefer minor units (kuruş) if non-zero, else fall back to legacy float.
      const amount =
        r.amountMinor && r.amountMinor > 0
          ? r.amountMinor / 100
          : Number(r.amount) || 0;
      return {
        escrowId: r.id,
        bookingId: r.bookingId,
        jobId: booking?.jobId ?? null,
        jobTitle:
          job?.title ?? booking?.category ?? booking?.description ?? null,
        counterparty: {
          id: counterpartyId,
          fullName: cp?.fullName ?? 'Bilinmeyen',
          profileImageUrl: cp?.profileImageUrl ?? null,
        },
        amount,
        confirmationStatus: r.confirmationStatus,
        graceEndsAt: r.graceEndsAt ? r.graceEndsAt.toISOString() : null,
        mySide,
        myConfirmed,
      };
    });

    // Sort: pending_grace first (time-sensitive), then awaiting.
    mapped.sort((a, b) => {
      const rank = (s: ConfirmationStatus) =>
        s === ConfirmationStatus.PENDING_GRACE ? 0 : 1;
      const ra = rank(a.confirmationStatus);
      const rb = rank(b.confirmationStatus);
      if (ra !== rb) return ra - rb;
      // Within pending_grace, soonest deadline first.
      if (a.graceEndsAt && b.graceEndsAt) {
        return a.graceEndsAt.localeCompare(b.graceEndsAt);
      }
      return 0;
    });

    return mapped;
  }

  /**
   * Phase 2 — Confirmation v2 flag. When true: photo+approval first, then the
   * payer (customer) mints the QR and the worker scans it to release payment.
   * When false (default), ALL legacy behavior is preserved byte-for-byte.
   */
  private get v2(): boolean {
    return this.config.get<string>('CONFIRMATION_V2_ENABLED') === 'true';
  }

  // ------------- helpers -------------

  /**
   * Bug #2 bridge — confirmation flow operates on PaymentEscrow shape, but
   * `/escrow/hold` writes to BookingEscrow. This helper finds an escrow in
   * either table and returns a uniform handle (`PaymentEscrow`-shaped view +
   * source-aware `save()`). For BookingEscrow rows we adapt: `workerId` →
   * `taskerId`, status mapping is best-effort (BookingEscrow.status uses a
   * different enum but confirmation only reads paymentStatus for the
   * pre-flight check, which we synthesize as 'paid' when status === HELD).
   */
  private async findEscrowAnywhere(
    id: string,
  ): Promise<{ escrow: PaymentEscrow; save: () => Promise<void> }> {
    const fromPayment = await this.escrowRepo.findOne({ where: { id } });
    if (fromPayment) {
      return {
        escrow: fromPayment,
        save: async () => {
          await this.escrowRepo.save(fromPayment);
        },
      };
    }
    const fromBooking = await this.bookingEscrowRepo.findOne({ where: { id } });
    if (!fromBooking) throw new NotFoundException('Escrow not found');
    // Adapt BookingEscrow → PaymentEscrow-shaped view. We mutate the same
    // underlying instance for confirmation fields so save() persists them.
    const adapted = fromBooking as unknown as PaymentEscrow;
    // Synthesize PaymentEscrow-only fields that confirmation service reads.
    if (!('taskerId' in fromBooking) || !adapted.taskerId) {
      Object.defineProperty(adapted, 'taskerId', {
        get: () => fromBooking.workerId,
        set: (v: string) => {
          fromBooking.workerId = v;
        },
        configurable: true,
      });
    }
    // paymentStatus: BookingEscrow has no such column. The `start()` guard
    // requires 'paid' or 'held'. Map BookingEscrow.status HELD/RELEASED →
    // 'paid' so the guard passes; otherwise leave undefined → BadRequest.
    if (!('paymentStatus' in adapted) || !adapted.paymentStatus) {
      Object.defineProperty(adapted, 'paymentStatus', {
        get: () =>
          fromBooking.status === 'held' || fromBooking.status === 'released'
            ? 'paid'
            : 'pending',
        configurable: true,
      });
    }
    // jobId is not stored on BookingEscrow (it's booking-scoped). Provide
    // bookingId as a fallback so the notification refId is meaningful.
    if (!('jobId' in adapted) || !adapted.jobId) {
      Object.defineProperty(adapted, 'jobId', {
        get: () => fromBooking.bookingId,
        configurable: true,
      });
    }
    return {
      escrow: adapted,
      save: async () => {
        await this.bookingEscrowRepo.save(fromBooking);
      },
    };
  }

  private async loadEscrow(id: string): Promise<PaymentEscrow> {
    const { escrow } = await this.findEscrowAnywhere(id);
    return escrow;
  }

  private sideOf(escrow: PaymentEscrow, userId: string): ConfirmationSide {
    if (escrow.taskerId === userId) return 'worker';
    if (escrow.customerId === userId) return 'customer';
    throw new ForbiddenException('Not a party to this escrow');
  }

  tierRequirements(tier: ConfirmationTier): TierRequirements {
    return requirementsFor(tier);
  }

  // ------------- endpoints -------------

  async start(
    escrowId: string,
    userId: string,
    lat: number,
    lng: number,
  ): Promise<ConfirmationStartResponse> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    if (escrow.taskerId !== userId) {
      throw new ForbiddenException('Only worker may start confirmation');
    }
    if (escrow.paymentStatus !== 'paid' && escrow.paymentStatus !== 'held') {
      // accept 'paid' (post-iyzipay capture) and legacy 'held'; reject pending/failed/refunded.
      // The status string in this codebase uses 'pending' → 'paid' (see confirmByToken).
      if (escrow.paymentStatus !== 'paid') {
        throw new BadRequestException(
          `Escrow not in held/paid state (paymentStatus=${escrow.paymentStatus})`,
        );
      }
    }
    if (
      escrow.confirmationStatus === ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new ConflictException('Confirmation already started');
    }

    const now = Date.now();
    const tier = tierFor(escrow.amountMinor || 0);
    // v2: NO QR mint here — the QR is minted later by the payer (customer) via
    // getQr() after BOTH parties approve. Legacy: worker mints the QR on start.
    const token = this.v2 ? null : mintQrToken(escrow.id, now);
    const issuedAt = this.v2 ? null : new Date(now);
    const deadlineMs = await this.platformSettings
      .getEscrowDeadlineMs()
      .catch(() => DEFAULT_CONFIRMATION_DEADLINE_MS);
    const deadline = new Date(now + deadlineMs);

    escrow.confirmationStatus = ConfirmationStatus.AWAITING_CONFIRMATION;
    escrow.confirmationTier = tier;
    escrow.qrToken = token;
    escrow.qrIssuedAt = issuedAt;
    escrow.workerLat = lat;
    escrow.workerLng = lng;
    escrow.confirmationDeadline = deadline;
    await save();

    // Phase 253 — notify customer to start confirmation flow
    try {
      await this.notificationsService.send({
        userId: escrow.customerId,
        type: NotificationType.SYSTEM,
        title: 'Onay sürecini başlat',
        body: 'Usta işi tamamladığını bildirdi. QR kodu okutup onay verebilirsin.',
        refId: escrow.id,
        relatedType: 'job',
        relatedId: escrow.jobId,
      });
    } catch (err) {
      this.logger.warn(
        `CONFIRMATION_START notification failed: ${(err as Error).message}`,
      );
    }

    return {
      qrToken: token,
      qrIssuedAt: issuedAt,
      expiresAt: this.v2 ? null : new Date(now + QR_TTL_MS),
      tier,
      // v2: tiers are flattened — always full (before+after photos + GPS).
      requirements: this.v2 ? STANDARD_REQUIREMENTS : requirementsFor(tier),
      confirmationDeadline: deadline,
    };
  }

  async getQr(
    escrowId: string,
    userId: string,
    lat?: number | null,
    lng?: number | null,
  ): Promise<{ qrToken: string; expiresAt: Date; tier: ConfirmationTier }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);

    if (this.v2) {
      // v2: PAYER (customer) mints the QR, allowed only after BOTH approvals.
      if (escrow.customerId !== userId) {
        throw new ForbiddenException('Only payer may generate QR');
      }
      if (
        escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
      ) {
        throw new BadRequestException('Confirmation not started');
      }
      if (!escrow.workerConfirmedAt || !escrow.customerConfirmedAt) {
        throw new BadRequestException('approvals incomplete');
      }
      const nowMs = Date.now();
      const issuedMs = escrow.qrIssuedAt?.getTime() ?? 0;
      let token = escrow.qrToken;
      let issuedAt = escrow.qrIssuedAt;
      if (!token || nowMs - issuedMs > QR_TTL_MS) {
        token = mintQrToken(escrow.id, nowMs);
        issuedAt = new Date(nowMs);
        escrow.qrToken = token;
        escrow.qrIssuedAt = issuedAt;
      }
      // Record the payer's GPS so the worker scan can be proximity-matched.
      if (lat != null && lng != null) {
        escrow.customerLat = lat;
        escrow.customerLng = lng;
      }
      await save();
      return {
        qrToken: token,
        expiresAt: new Date(issuedAt!.getTime() + QR_TTL_MS),
        tier: escrow.confirmationTier ?? ConfirmationTier.STANDARD,
      };
    }

    if (escrow.taskerId !== userId) {
      throw new ForbiddenException('Only worker may fetch QR');
    }
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not started');
    }
    const now = Date.now();
    const issuedMs = escrow.qrIssuedAt?.getTime() ?? 0;
    let token = escrow.qrToken;
    let issuedAt = escrow.qrIssuedAt!;
    if (!token || now - issuedMs > QR_TTL_MS) {
      token = mintQrToken(escrow.id, now);
      issuedAt = new Date(now);
      escrow.qrToken = token;
      escrow.qrIssuedAt = issuedAt;
      await save();
    }
    return {
      qrToken: token,
      expiresAt: new Date(issuedAt.getTime() + QR_TTL_MS),
      tier: escrow.confirmationTier!,
    };
  }

  async getState(
    escrowId: string,
    userId: string,
  ): Promise<ConfirmationStateResponse> {
    const escrow = await this.loadEscrow(escrowId);
    if (escrow.taskerId !== userId && escrow.customerId !== userId) {
      throw new ForbiddenException('Not a party');
    }
    const tier = escrow.confirmationTier;
    const reqs = tier
      ? requirementsFor(tier)
      : { photosPerPhase: 0, videoRequired: false, gpsMatchRequired: false };

    const photos = await this.photoRepo.find({ where: { escrowId } });
    const video = await this.videoRepo.findOne({ where: { escrowId } });

    return {
      escrowId,
      confirmationStatus: escrow.confirmationStatus,
      tier,
      requirements: reqs,
      qrIssuedAt: escrow.qrIssuedAt,
      qrScannedAt: escrow.qrScannedAt,
      confirmationDeadline: escrow.confirmationDeadline,
      graceEndsAt: escrow.graceEndsAt ?? null,
      workerLat: escrow.workerLat,
      workerLng: escrow.workerLng,
      customerLat: escrow.customerLat,
      customerLng: escrow.customerLng,
      workerConfirmedAt: escrow.workerConfirmedAt,
      customerConfirmedAt: escrow.customerConfirmedAt,
      photos,
      videoUrl: video?.videoUrl ?? null,
      allConditionsMetWorker: this.conditionsMet(escrow, photos, 'worker'),
      allConditionsMetCustomer: this.conditionsMet(escrow, photos, 'customer'),
    };
  }

  async scan(
    escrowId: string,
    userId: string,
    qrToken: string,
    lat: number,
    lng: number,
  ): Promise<{
    ok: true;
    gpsMatch: boolean;
    distanceM: number | null;
    released?: boolean;
  }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);

    if (this.v2) {
      return this.scanV2(escrow, save, userId, qrToken, lat, lng);
    }

    if (escrow.customerId !== userId) {
      throw new ForbiddenException('Only customer may scan');
    }
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }
    if (!escrow.qrToken || escrow.qrToken !== qrToken) {
      throw new BadRequestException('QR token mismatch');
    }
    const issuedMs = escrow.qrIssuedAt?.getTime() ?? 0;
    if (Date.now() - issuedMs > QR_TTL_MS) {
      throw new BadRequestException('QR expired');
    }
    if (!verifyQrToken(qrToken, escrow.id)) {
      throw new BadRequestException('QR signature invalid');
    }

    let distance: number | null = null;
    let gpsMatch = true;
    if (
      escrow.workerLat != null &&
      escrow.workerLng != null &&
      lat != null &&
      lng != null
    ) {
      distance = haversineMeters(escrow.workerLat, escrow.workerLng, lat, lng);
      const tier = escrow.confirmationTier;
      const requires =
        tier === ConfirmationTier.STANDARD || tier === ConfirmationTier.PREMIUM;
      const settingsRequired = await this.platformSettings
        .getEscrowGpsRequired()
        .catch(() => false);
      const radius = await this.platformSettings
        .getEscrowGpsRadiusM()
        .catch(() => DEFAULT_GPS_MATCH_RADIUS_M);
      gpsMatch = !settingsRequired || !requires || distance <= radius;
    }

    escrow.qrScannedAt = new Date();
    escrow.customerLat = lat;
    escrow.customerLng = lng;
    await save();

    return { ok: true, gpsMatch, distanceM: distance };
  }

  /**
   * v2 scan: WORKER scans the payer's QR. Allowed only after BOTH approvals.
   * On a valid token + GPS proximity match this is the SINGLE place that
   * releases the held payment — guarded against double release.
   */
  private async scanV2(
    escrow: PaymentEscrow,
    save: () => Promise<void>,
    userId: string,
    qrToken: string,
    lat: number,
    lng: number,
  ): Promise<{
    ok: true;
    gpsMatch: boolean;
    distanceM: number | null;
    released: boolean;
  }> {
    if (escrow.taskerId !== userId) {
      throw new ForbiddenException('Only worker may scan');
    }
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }
    if (!escrow.workerConfirmedAt || !escrow.customerConfirmedAt) {
      throw new BadRequestException('approvals incomplete');
    }
    if (!escrow.qrToken || escrow.qrToken !== qrToken) {
      throw new BadRequestException('QR token mismatch');
    }
    const issuedMs = escrow.qrIssuedAt?.getTime() ?? 0;
    if (Date.now() - issuedMs > QR_TTL_MS) {
      throw new BadRequestException('QR expired');
    }
    if (!verifyQrToken(qrToken, escrow.id)) {
      throw new BadRequestException('QR signature invalid');
    }

    // GPS: worker scan position (lat/lng) vs the payer's recorded position.
    let distance: number | null = null;
    let gpsMatch = true;
    if (
      escrow.customerLat != null &&
      escrow.customerLng != null &&
      lat != null &&
      lng != null
    ) {
      distance = haversineMeters(
        escrow.customerLat,
        escrow.customerLng,
        lat,
        lng,
      );
      const settingsRequired = await this.platformSettings
        .getEscrowGpsRequired()
        .catch(() => false);
      const radius = await this.platformSettings
        .getEscrowGpsRadiusM()
        .catch(() => DEFAULT_GPS_MATCH_RADIUS_M);
      gpsMatch = !settingsRequired || distance <= radius;
    }
    if (!gpsMatch) {
      throw new BadRequestException('gps_too_far');
    }

    // Idempotency guard: if already scanned/released, do not release again.
    if (escrow.qrScannedAt) {
      return { ok: true, gpsMatch, distanceM: distance, released: false };
    }

    escrow.qrScannedAt = new Date();
    escrow.workerLat = lat;
    escrow.workerLng = lng;
    await save();

    // SINGLE release point for v2 — both parties have approved and the QR
    // handshake is complete. adminRole='admin' bypasses the customer-only guard.
    await this.escrowService.release(
      escrow.id,
      'system',
      'qr handshake complete',
      'admin',
    );

    return { ok: true, gpsMatch, distanceM: distance, released: true };
  }

  async addPhoto(args: {
    escrowId: string;
    userId: string;
    phase: ConfirmationPhase;
    photoUrl: string;
    lat: number | null;
    lng: number | null;
    takenAt: Date | null;
  }): Promise<EscrowConfirmationPhoto> {
    const escrow = await this.loadEscrow(args.escrowId);
    const side = this.sideOf(escrow, args.userId);
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }
    if (this.v2) {
      // v2: tiers flattened — photos always required, and each photo must carry GPS.
      if (args.lat == null || args.lng == null) {
        throw new BadRequestException('photo_gps_required');
      }
    } else if (escrow.confirmationTier === ConfirmationTier.LITE) {
      throw new BadRequestException('Photos not required for lite tier');
    }
    if (args.phase !== 'before' && args.phase !== 'after') {
      throw new BadRequestException('Invalid phase');
    }
    const row = this.photoRepo.create({
      escrowId: args.escrowId,
      uploadedByUserId: args.userId,
      side,
      phase: args.phase,
      photoUrl: args.photoUrl,
      lat: args.lat,
      lng: args.lng,
      takenAt: args.takenAt,
    });
    return this.photoRepo.save(row);
  }

  async addVideo(args: {
    escrowId: string;
    userId: string;
    videoUrl: string;
    durationSec: number | null;
    lat: number | null;
    lng: number | null;
  }): Promise<EscrowConfirmationVideo> {
    const escrow = await this.loadEscrow(args.escrowId);
    const side = this.sideOf(escrow, args.userId);
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }
    if (escrow.confirmationTier !== ConfirmationTier.PREMIUM) {
      throw new BadRequestException('Video only allowed for premium tier');
    }
    if (
      args.durationSec != null &&
      (args.durationSec < 5 || args.durationSec > 120)
    ) {
      throw new BadRequestException('Video duration must be 5-120 seconds');
    }
    const row = this.videoRepo.create({
      escrowId: args.escrowId,
      uploadedByUserId: args.userId,
      side,
      videoUrl: args.videoUrl,
      durationSec: args.durationSec,
      lat: args.lat,
      lng: args.lng,
    });
    return this.videoRepo.save(row);
  }

  private conditionsMet(
    escrow: PaymentEscrow,
    photos: EscrowConfirmationPhoto[],
    side: ConfirmationSide,
  ): boolean {
    const tier = escrow.confirmationTier;
    if (!tier) return false;
    if (!escrow.qrScannedAt) return false;
    if (tier === ConfirmationTier.LITE) return true;

    // standard / premium: GPS match + each side has ≥1 before AND ≥1 after photo
    if (
      escrow.workerLat == null ||
      escrow.workerLng == null ||
      escrow.customerLat == null ||
      escrow.customerLng == null
    ) {
      return false;
    }
    const dist = haversineMeters(
      escrow.workerLat,
      escrow.workerLng,
      escrow.customerLat,
      escrow.customerLng,
    );
    if (dist > DEFAULT_GPS_MATCH_RADIUS_M) return false;

    const sidePhotos = photos.filter((p) => p.side === side);
    const hasBefore = sidePhotos.some((p) => p.phase === 'before');
    const hasAfter = sidePhotos.some((p) => p.phase === 'after');
    return hasBefore && hasAfter;
  }

  /**
   * v2 approval. Either side approves (no photo requirement — photos are hidden
   * in v2). Sets `<side>ConfirmedAt`. Crucially this does NOT release payment —
   * release is deferred to the worker's QR scan, where GPS proximity is checked.
   */
  async approve(
    escrowId: string,
    userId: string,
  ): Promise<{
    side: ConfirmationSide;
    bothApproved: boolean;
    awaitingQr: boolean;
  }> {
    if (!this.v2) {
      // Defensive: approve() is the v2 entry point. If the flag is off, route
      // callers to the legacy confirm() so behavior stays unchanged.
      const legacy = await this.confirm(escrowId, userId);
      const bothApproved = legacy.escrowReleased;
      return { side: legacy.side, bothApproved, awaitingQr: false };
    }

    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    const side = this.sideOf(escrow, userId);
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }

    // Block double-approve by same side.
    if (side === 'worker' && escrow.workerConfirmedAt) {
      throw new ConflictException('Worker already approved');
    }
    if (side === 'customer' && escrow.customerConfirmedAt) {
      throw new ConflictException('Customer already approved');
    }

    // v2: no photo/GPS gate at approval — approval is just the explicit "Onayla".
    // GPS proximity is enforced later when the worker scans the payer's QR.
    const now = new Date();
    if (side === 'worker') escrow.workerConfirmedAt = now;
    else escrow.customerConfirmedAt = now;
    await save();

    const bothApproved = !!(
      escrow.workerConfirmedAt && escrow.customerConfirmedAt
    );
    // NOTE: NO escrowService.release() here — payment is released only when the
    // worker scans the payer's QR (scanV2). This is the core v2 money-flow rule.
    return { side, bothApproved, awaitingQr: bothApproved };
  }

  async confirm(
    escrowId: string,
    userId: string,
  ): Promise<{
    side: ConfirmationSide;
    allConditionsMet: boolean;
    escrowStatus: string;
    escrowReleased: boolean;
    missing?: string[];
  }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    const side = this.sideOf(escrow, userId);
    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION
    ) {
      throw new BadRequestException('Confirmation not active');
    }

    // Block double-confirm by same side
    if (side === 'worker' && escrow.workerConfirmedAt) {
      throw new ConflictException('Worker already confirmed');
    }
    if (side === 'customer' && escrow.customerConfirmedAt) {
      throw new ConflictException('Customer already confirmed');
    }

    const photos = await this.photoRepo.find({ where: { escrowId } });
    const missing = this.computeMissing(escrow, photos, side);
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Requirements not met',
        missing,
      });
    }

    const now = new Date();
    if (side === 'worker') escrow.workerConfirmedAt = now;
    else escrow.customerConfirmedAt = now;
    await save();

    let released = false;
    if (escrow.workerConfirmedAt && escrow.customerConfirmedAt) {
      // Release via existing service. Pass adminRole='admin' to bypass customer-only
      // guard, since this is a SYSTEM-driven release once both parties signed off.
      await this.escrowService.release(
        escrow.id,
        'system',
        'mutual confirmation complete',
        'admin',
      );
      released = true;
    }

    const refreshed = await this.loadEscrow(escrowId);
    return {
      side,
      allConditionsMet: true,
      escrowStatus: refreshed.status,
      escrowReleased: released,
    };
  }

  private computeMissing(
    escrow: PaymentEscrow,
    photos: EscrowConfirmationPhoto[],
    side: ConfirmationSide,
  ): string[] {
    const missing: string[] = [];
    const tier = escrow.confirmationTier;
    if (!tier) {
      missing.push('confirmation not started');
      return missing;
    }
    if (!escrow.qrScannedAt) missing.push('qr_not_scanned');
    if (tier === ConfirmationTier.LITE) return missing;

    // gps check
    if (
      escrow.workerLat == null ||
      escrow.workerLng == null ||
      escrow.customerLat == null ||
      escrow.customerLng == null
    ) {
      missing.push('gps_missing');
    } else {
      const dist = haversineMeters(
        escrow.workerLat,
        escrow.workerLng,
        escrow.customerLat,
        escrow.customerLng,
      );
      if (dist > DEFAULT_GPS_MATCH_RADIUS_M) missing.push('gps_too_far');
    }

    const sidePhotos = photos.filter((p) => p.side === side);
    if (!sidePhotos.some((p) => p.phase === 'before')) {
      missing.push(`${side}_before_photo`);
    }
    if (!sidePhotos.some((p) => p.phase === 'after')) {
      missing.push(`${side}_after_photo`);
    }
    return missing;
  }

  // ------------- Phase 267 — Plain confirm + grace period -------------

  /**
   * Plain confirmation entry. Bypasses QR + photos + GPS — only auth check
   * and side resolution. Sets workerConfirmedAt/customerConfirmedAt; when
   * both sides are signed off, transitions into PENDING_GRACE with a
   * graceEndsAt deadline (1hr default, admin-tunable). Release is deferred
   * to the cron sweep that flips PENDING_GRACE → COMPLETED.
   */
  async confirmPlain(
    escrowId: string,
    userId: string,
  ): Promise<{
    side: ConfirmationSide;
    bothApproved: boolean;
    graceEndsAt: Date | null;
    confirmationStatus: ConfirmationStatus;
  }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    const side = this.sideOf(escrow, userId);

    if (
      escrow.confirmationStatus !== ConfirmationStatus.AWAITING_CONFIRMATION &&
      escrow.confirmationStatus !== ConfirmationStatus.NONE
    ) {
      throw new BadRequestException(
        `Cannot confirm from status ${escrow.confirmationStatus}`,
      );
    }

    // Lazy-start: if NONE, transition to AWAITING and set deadline.
    if (escrow.confirmationStatus === ConfirmationStatus.NONE) {
      const deadlineMs = await this.platformSettings
        .getEscrowDeadlineMs()
        .catch(() => DEFAULT_CONFIRMATION_DEADLINE_MS);
      escrow.confirmationStatus = ConfirmationStatus.AWAITING_CONFIRMATION;
      escrow.confirmationDeadline = new Date(Date.now() + deadlineMs);
    }

    // Idempotent double-confirm guard.
    if (side === 'worker' && escrow.workerConfirmedAt) {
      throw new ConflictException('Worker already confirmed');
    }
    if (side === 'customer' && escrow.customerConfirmedAt) {
      throw new ConflictException('Customer already confirmed');
    }

    const now = new Date();
    if (side === 'worker') escrow.workerConfirmedAt = now;
    else escrow.customerConfirmedAt = now;

    const bothApproved = !!(
      escrow.workerConfirmedAt && escrow.customerConfirmedAt
    );

    if (bothApproved) {
      const graceMs = await this.platformSettings
        .getEscrowGraceMs()
        .catch(() => 60 * 60 * 1000);
      escrow.confirmationStatus = ConfirmationStatus.PENDING_GRACE;
      escrow.graceEndsAt = new Date(Date.now() + graceMs);
    }
    await save();

    // Notify the other side that their action is awaited (or grace started).
    try {
      const targetId = side === 'worker' ? escrow.customerId : escrow.taskerId;
      if (bothApproved) {
        await this.notificationsService.send({
          userId: targetId,
          type: NotificationType.SYSTEM,
          title: 'Onay süreci başladı',
          body: '1 saatlik bekleme süreci başladı. Bu süre içinde iptal edebilirsiniz.',
          refId: escrow.id,
        });
      } else {
        await this.notificationsService.send({
          userId: targetId,
          type: NotificationType.SYSTEM,
          title: 'Karşı taraf onayladı',
          body: 'Hizmeti onaylamak için uygulamayı kontrol edin.',
          refId: escrow.id,
        });
      }
    } catch (err) {
      this.logger.warn(
        `confirmPlain notification failed: ${(err as Error).message}`,
      );
    }

    return {
      side,
      bothApproved,
      graceEndsAt: escrow.graceEndsAt,
      confirmationStatus: escrow.confirmationStatus,
    };
  }

  /**
   * Cancel during grace window. Either party may invoke; flips status to
   * CANCELLED and clears the grace deadline. Payment is NOT released.
   * After grace elapses (PENDING_GRACE → COMPLETED), this is no longer valid.
   */
  async cancelGrace(
    escrowId: string,
    userId: string,
    reason?: string,
  ): Promise<{ confirmationStatus: ConfirmationStatus }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    // sideOf throws if not a party.
    this.sideOf(escrow, userId);

    if (escrow.confirmationStatus !== ConfirmationStatus.PENDING_GRACE) {
      throw new BadRequestException(
        `Cannot cancel from status ${escrow.confirmationStatus}`,
      );
    }
    if (escrow.graceEndsAt && escrow.graceEndsAt.getTime() < Date.now()) {
      throw new BadRequestException('Grace period already elapsed');
    }

    escrow.confirmationStatus = ConfirmationStatus.CANCELLED;
    escrow.graceEndsAt = null;
    // Soft-clear confirmation timestamps so a fresh round can be initiated.
    escrow.workerConfirmedAt = null;
    escrow.customerConfirmedAt = null;
    await save();

    // Notify both parties.
    for (const uid of [escrow.taskerId, escrow.customerId]) {
      try {
        await this.notificationsService.send({
          userId: uid,
          type: NotificationType.SYSTEM,
          title: 'Onay iptal edildi',
          body: reason ?? 'Bekleme süresi içinde onay iptal edildi.',
          refId: escrow.id,
        });
      } catch (err) {
        this.logger.warn(
          `cancelGrace notification ${uid} failed: ${(err as Error).message}`,
        );
      }
    }

    return { confirmationStatus: escrow.confirmationStatus };
  }

  /**
   * Phase 267 — finalize the grace window immediately (skip the 1hr wait).
   * Either party may invoke during PENDING_GRACE; flips status to COMPLETED,
   * clears graceEndsAt, and releases the payment via EscrowService.
   */
  async finalizeGraceEarly(
    escrowId: string,
    userId: string,
  ): Promise<{ confirmationStatus: ConfirmationStatus; released: boolean }> {
    const { escrow, save } = await this.findEscrowAnywhere(escrowId);
    // sideOf throws if not a party.
    const side = this.sideOf(escrow, userId);

    if (escrow.confirmationStatus !== ConfirmationStatus.PENDING_GRACE) {
      throw new BadRequestException(
        `Cannot finalize from status ${escrow.confirmationStatus}`,
      );
    }
    if (escrow.graceEndsAt && escrow.graceEndsAt.getTime() < Date.now()) {
      throw new BadRequestException('Grace period already elapsed');
    }

    escrow.confirmationStatus = ConfirmationStatus.COMPLETED;
    escrow.graceEndsAt = null;
    await save();

    // Release payment (admin role bypasses customer-only guard).
    let released = false;
    try {
      await this.escrowService.release(
        escrow.id,
        'system',
        'grace finalized early by party',
        'admin',
      );
      released = true;
    } catch (err) {
      this.logger.warn(
        `finalizeGraceEarly release ${escrow.id} failed: ${(err as Error).message}`,
      );
    }

    // Notify the OTHER party (initiator already knows what they pressed).
    try {
      const targetId = side === 'worker' ? escrow.customerId : escrow.taskerId;
      await this.notificationsService.send({
        userId: targetId,
        type: NotificationType.SYSTEM,
        title: 'Hizmet Tamamlandı',
        body: 'Karşı taraf onayı hemen tamamladı; ödeme serbest bırakıldı.',
        refId: escrow.id,
      });
    } catch (err) {
      this.logger.warn(
        `finalizeGraceEarly notification failed: ${(err as Error).message}`,
      );
    }

    return { confirmationStatus: escrow.confirmationStatus, released };
  }
}
