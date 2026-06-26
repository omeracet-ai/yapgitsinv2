import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Offer, OfferStatus } from './offer.entity';
import { Job, JobStatus } from './job.entity';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { EscrowService } from '../escrow/escrow.service';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ChatService } from '../chat/chat.service';
import { tlToMinor } from '../../common/money.util';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private tokensService: TokensService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private escrowService: EscrowService,
    private userBlocksService: UserBlocksService,
    private subscriptionsService: SubscriptionsService,
    private dataSource: DataSource,
    // Phase 401 — Accept sonrası iki taraf arasında otomatik chat başlatma için.
    private chatService: ChatService,
  ) {}

  /**
   * Phase 45 — Teklif geri çekme + token iadesi.
   * Sadece teklif sahibi, status pending|countered, job status open ise.
   * Atomik: status → withdrawn + 5 token refund + TokenTransaction yaz.
   */
  async withdrawOffer(
    jobId: string,
    offerId: string,
    userId: string,
  ): Promise<{
    id: string;
    status: OfferStatus;
    refunded: boolean;
    refundAmount: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const offer = await manager.findOne(Offer, { where: { id: offerId } });
      if (!offer) throw new NotFoundException(`Teklif bulunamadı: #${offerId}`);
      if (offer.jobId !== jobId) {
        throw new BadRequestException('Teklif bu ilana ait değil');
      }
      if (offer.userId !== userId) {
        throw new ForbiddenException('Sadece teklif sahibi geri çekebilir');
      }
      if (
        offer.status !== OfferStatus.PENDING &&
        offer.status !== OfferStatus.COUNTERED
      ) {
        throw new BadRequestException(
          `Bu teklif geri çekilemez (durum: ${offer.status})`,
        );
      }

      const job = await manager.findOne(Job, { where: { id: jobId } });
      if (!job) throw new NotFoundException('İlan bulunamadı');
      if (job.status !== JobStatus.OPEN) {
        throw new BadRequestException(
          `İlan açık değil, teklif geri çekilemez (durum: ${job.status})`,
        );
      }

      offer.status = OfferStatus.WITHDRAWN;
      await manager.save(Offer, offer);

      // Phase 262 — pazarlık zincirinin alt halkalarını da kapat. Aksi halde
      // karşı tarafın açık (PENDING) karşı teklifi dangling kalır ve geri
      // çekilmiş kök, acceptCounter ile diriltilip booking/escrow yaratabilirdi.
      let cursor: Offer = offer;
      for (;;) {
        const child: Offer | null = await manager.findOne(Offer, {
          where: { parentOfferId: cursor.id },
          order: { negotiationRound: 'DESC' },
        });
        if (!child) break;
        if (
          child.status === OfferStatus.PENDING ||
          child.status === OfferStatus.COUNTERED
        ) {
          child.status = OfferStatus.WITHDRAWN;
          await manager.save(Offer, child);
        }
        cursor = child;
      }

      // Phase 401 — Teklif geri çekildiğinde kredi iadesi YOK (kullanıcı
      // spec'i: harcanan kredi silinir, kullanıcılar arası transfer/aktarım
      // hiçbir şekilde olmaz). refundAmount sabit 0.

      return {
        id: offer.id,
        status: offer.status,
        refunded: false,
        refundAmount: 0,
      };
    });
  }

  /**
   * Phase 510 — Public preview: bir iş için teklif maliyetini önceden
   * gösterir (auth gerektirmez — Flutter hint banner buradan çekiyor).
   * Cost basis = job.budgetMax ?? budgetMin (ikisi de yoksa 0 → min'e
   * clamp). Idempotent, side-effect yok.
   */
  async getOfferCostPreview(jobId: string): Promise<{
    cost: number;
    basis: number;
    mode: 'flat' | 'percent';
    pct?: number;
    min: number;
    max: number;
    breakdown: string;
  }> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('İlan bulunamadı');
    const basis = job.budgetMax ?? job.budgetMin ?? 0;
    const result = await this.tokensService.computeOfferCost(basis);
    return {
      cost: result.cost,
      basis: result.basis,
      mode: result.mode,
      pct: result.pct,
      min: result.min,
      max: result.max,
      breakdown: result.breakdown,
    };
  }

  async findByJob(jobId: string): Promise<Offer[]> {
    const offers = await this.offersRepository.find({
      where: { jobId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    if (offers.length === 0) return offers;
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job?.customerId) return offers;
    const blockedIds = await this.userBlocksService.listBlockedIds(
      job.customerId,
    );
    if (blockedIds.length === 0) return offers;
    const blockedSet = new Set(blockedIds);
    return offers.filter((o) => !blockedSet.has(o.userId));
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.offersRepository.findAndCount({
      where: { userId },
      relations: ['job'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findByProvider(userId: string): Promise<Offer[]> {
    return (await this.findByUser(userId)).data;
  }

  async findOffersByCustomer(customerId: string): Promise<Offer[]> {
    return this.offersRepository
      .createQueryBuilder('offer')
      .innerJoinAndSelect('offer.job', 'job')
      .leftJoinAndSelect('offer.user', 'user')
      .where('job.customerId = :customerId', { customerId })
      .orderBy('offer.createdAt', 'DESC')
      .take(30)
      .getMany();
  }

  async create(data: {
    jobId: string;
    userId: string;
    price: number;
    message?: string;
    attachmentUrls?: string[];
    lineItems?: Array<{
      label: string;
      qty: number;
      unitPrice: number;
      total: number;
    }>;
    // Phase 316 — opsiyonel önerilen tarih/saat (flexible/urgent ilanlar).
    proposedDate?: string;
    proposedTime?: string;
  }): Promise<Offer> {
    this._assertLineItemsMatchPrice(data.lineItems, data.price);

    // Phase 265 — Özel ilan gating: targetWorkerId set ise SADECE hedef teklif verebilir.
    const job = await this.jobsRepository.findOne({
      where: { id: data.jobId },
    });

    // Phase 507 (M5) — İlan sahibi kendi ilanına teklif veremez.
    if (job && job.customerId === data.userId) {
      throw new ForbiddenException('Kendi ilanınıza teklif veremezsiniz.');
    }

    // Phase 507 (M7) — Teklif minimum bütçenin %90'ı olmalı.
    this._assertMinPriceFloor(job, data.price);

    if (
      job?.targetWorkerId &&
      job.targetWorkerId !== data.userId &&
      job.customerId !== data.userId
    ) {
      throw new ForbiddenException(
        'Bu ilan başka bir ustaya özel açılmış; teklif veremezsiniz.',
      );
    }

    // Phase 265c — REFRESH-OR-INSERT: kullanıcının bu ilanda zaten PENDING root
    // teklifi varsa yeni satır oluşturmak yerine onu günceller (kredi düşmez,
    // refreshCount++ + refreshedAt). Diğer kullanıcılar "Güncellendi" rozeti görür.
    const existing = await this.offersRepository.findOne({
      where: {
        jobId: data.jobId,
        userId: data.userId,
        parentOfferId: null as unknown as string,
        status: OfferStatus.PENDING,
      },
    });
    if (existing) {
      existing.price = data.price;
      existing.priceMinor = tlToMinor(data.price) ?? 0;
      if (data.message !== undefined) existing.message = data.message;
      existing.attachmentUrls = this._sanitizeAttachments(data.attachmentUrls);
      existing.lineItems =
        data.lineItems && data.lineItems.length > 0 ? data.lineItems : null;
      // Phase 316 — yenilemede önerilen tarih/saat de güncellenir; null gönderilirse temizlenir.
      existing.proposedDate = data.proposedDate ?? null;
      existing.proposedTime = data.proposedTime ?? null;
      existing.refreshCount = (existing.refreshCount ?? 0) + 1;
      existing.refreshedAt = new Date();
      const updated = await this.offersRepository.save(existing);

      // İlan sahibine bildirim (teklif güncellendi).
      try {
        if (job && job.customerId && job.customerId !== data.userId) {
          await this.notificationsService.send({
            userId: job.customerId,
            type: NotificationType.NEW_OFFER,
            title: 'Teklif yenilendi',
            body: `"${job.title}" ilanında bir teklif ${data.price} ₺ olarak güncellendi`,
            refId: updated.id,
            relatedType: 'job',
            relatedId: job.id,
          });
        }
      } catch {
        /* notification opsiyonel */
      }
      return updated;
    }

    // Phase 110 — Pro/Premium aboneler için token kesimi yapılmaz (sınırsız teklif)
    // Phase 401 — Maliyet İLAN BÜTÇESİ üzerinden hesaplanır (kullanıcı spec'i:
    // tüm teklif veren aynı öder, teklif fiyatından bağımsız). budget yoksa
    // data.price fallback. Phase 287 percent mode varsayılan.
    const isSubscriber = await this.subscriptionsService.isActiveSubscriber(
      data.userId,
    );
    const costBasis = job?.budgetMax ?? job?.budgetMin ?? data.price;
    // Phase 510 — computeOfferCost artık breakdown döner; cost ile spend ediyoruz.
    const offerCostResult = await this.tokensService.computeOfferCost(costBasis);
    const offerCost = offerCostResult.cost;
    if (!isSubscriber) {
      // Phase 534 — Kredi sınırlaması kaldırıldı: bakiye yetmese de teklif
      // verilir, kredi negatife düşer. Net %5 bütçeden kesilir.
      await this.tokensService.spendOverdraft(
        data.userId,
        offerCost,
        `İlan #${data.jobId.slice(0, 8)} için teklif (${data.price} ₺ • ${offerCost} kredi)`,
      );
    }
    await this.usersService.bumpStat(data.userId, 'asWorkerTotal');
    // Phase 174b — minor sync: legacy float + integer kuruş aynı anda yazılır
    const offer = this.offersRepository.create({
      jobId: data.jobId,
      userId: data.userId,
      price: data.price,
      priceMinor: tlToMinor(data.price) ?? 0,
      message: data.message,
      attachmentUrls: this._sanitizeAttachments(data.attachmentUrls),
      lineItems:
        data.lineItems && data.lineItems.length > 0 ? data.lineItems : null,
      // Phase 316 — yeni teklifte önerilen tarih/saat (varsa).
      proposedDate: data.proposedDate ?? null,
      proposedTime: data.proposedTime ?? null,
      status: OfferStatus.PENDING,
      // Phase 287 — refund için iade tutarı bu kaydı dolaşacak.
      tokenCost: isSubscriber ? 0 : offerCost,
    });
    const saved = await this.offersRepository.save(offer);

    // Phase 253 — notify customer about new offer (fire-and-forget)
    try {
      const job = await this.jobsRepository.findOne({
        where: { id: data.jobId },
      });
      if (job && job.customerId && job.customerId !== data.userId) {
        await this.notificationsService.send({
          userId: job.customerId,
          type: NotificationType.NEW_OFFER,
          title: 'Yeni teklif aldın',
          body: `"${job.title}" ilanına ${data.price} ₺ teklif geldi`,
          refId: saved.id,
          relatedType: 'job',
          relatedId: job.id,
        });
      }
    } catch (err) {
      this.logger.warn(
        `NEW_OFFER notification failed: ${(err as Error).message}`,
      );
    }

    return saved;
  }

  /**
   * Phase 507 (M7) — Teklif/karşı-teklif fiyatı ilan bütçesinin %90 altına
   * düşemez. budgetMin varsa onu, yoksa budgetMax'i baz alır. İkisi de yoksa
   * (esnek ilan) kural uygulanmaz.
   */
  private _assertMinPriceFloor(
    job: { budgetMin?: number | null; budgetMax?: number | null } | null,
    price: number,
  ): void {
    if (!job) return;
    const basis = job.budgetMin ?? job.budgetMax ?? null;
    if (!basis || basis <= 0) return;
    const floor = Math.floor(basis * 0.9);
    if (price < floor) {
      throw new BadRequestException(
        `Teklif, bütçenin en az %90'ı olmalıdır (alt sınır: ${floor} TL).`,
      );
    }
  }

  /** lineItems doluysa sum(total) ile price farkı 1 TL'den fazla olmamalı. */
  private _assertLineItemsMatchPrice(
    lineItems: Array<{ total: number }> | undefined,
    price: number,
  ): void {
    if (!Array.isArray(lineItems) || lineItems.length === 0) return;
    const sum = lineItems.reduce((acc, it) => acc + Number(it.total || 0), 0);
    if (Math.abs(sum - price) > 1) {
      throw new BadRequestException('Kalemler toplamı fiyatla uyuşmuyor');
    }
  }

  /**
   * Airtasker-style ek dosyalar: max 5 URL, sadece http(s)://, her biri ≤500 char.
   * null/undefined → null (kolon NULLable).
   */
  private _sanitizeAttachments(urls?: string[]): string[] | null {
    if (!Array.isArray(urls) || urls.length === 0) return null;
    const cleaned = urls
      .filter((u): u is string => typeof u === 'string')
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u) && u.length <= 500);
    const unique = Array.from(new Set(cleaned)).slice(0, 5);
    return unique.length > 0 ? unique : null;
  }

  async accept(offerId: string, _requestUserId: string): Promise<Offer> {
    // Phase 262 — ATOMİK idempotency claim. Eski pattern (findOne→check→save)
    // read-then-write yarışına açıktı: eşzamanlı çift-tıkta iki çağrı da
    // PENDING görüp ikisi de booking + escrow hold + stat bump yapardı.
    // Tek koşullu UPDATE: yalnızca ilk çağrı ACCEPTED'a geçer (affected=1).
    // (tokens.service.spend() ile aynı atomik yaklaşım.)
    const claim = await this.offersRepository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.ACCEPTED })
      .where('id = :id AND status != :accepted', {
        id: offerId,
        accepted: OfferStatus.ACCEPTED,
      })
      .execute();
    const offer = await this._getOffer(offerId);
    // affected=0 → zaten kabul edilmiş; idempotent dön (booking/escrow tekrarlanmaz).
    if (!claim.affected) return offer;
    const saved = offer; // status artık ACCEPTED
    await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');

    const job = await this.jobsRepository.findOne({
      where: { id: saved.jobId },
    });
    const jobTitle = job?.title ?? '';

    // Escrow hold — bookkeeping only; never block accept on escrow failure
    let escrowHeld = false;
    try {
      if (job && job.customerId) {
        await this.escrowService.hold({
          jobId: saved.jobId,
          offerId: saved.id,
          amount: saved.price,
          customerId: job.customerId,
          taskerId: saved.userId,
        });
        escrowHeld = true;
      } else {
        this.logger.warn(
          `Escrow hold skipped: job or customer missing for offer ${saved.id}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Escrow hold failed for offer ${saved.id}: ${(err as Error)?.message ?? err}`,
      );
    }

    // Phase 253 — OFFER_ACCEPTED notification to worker + ESCROW_HOLD via SYSTEM
    try {
      await this.notificationsService.send({
        userId: saved.userId,
        type: NotificationType.OFFER_ACCEPTED,
        title: 'Teklifin kabul edildi',
        body: jobTitle
          ? `"${jobTitle}" — ${saved.price} ₺ teklifin kabul edildi`
          : `${saved.price} ₺ teklifin kabul edildi`,
        refId: saved.id,
        relatedType: 'job',
        relatedId: saved.jobId,
      });
      if (escrowHeld) {
        await this.notificationsService.send({
          userId: saved.userId,
          type: NotificationType.SYSTEM,
          title: 'Ödeme alındı, işe başlayabilirsin',
          body: `Ödeme güvende tutuluyor. İş tamamlandığında serbest bırakılacak.`,
          refId: saved.id,
          relatedType: 'job',
          relatedId: saved.jobId,
        });
      }
    } catch (err) {
      this.logger.warn(
        `OFFER_ACCEPTED notification failed: ${(err as Error).message}`,
      );
    }

    // Phase 401 — Teklif kabul edildiği anda iki taraf arasında Mesajlarım
    // listesinde konuşma görünsün diye sistem hoşgeldin mesajı eklenir.
    try {
      if (job && job.customerId) {
        await this.chatService.createAcceptanceWelcome({
          fromUserId: job.customerId,
          toUserId: saved.userId,
          jobId: saved.jobId,
          jobTitle,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Acceptance welcome chat insert failed: ${(err as Error).message}`,
      );
    }
    // Teklif kabulünü randevulaşma sistemine bağla: karşılıklı anlaşma (müşteri
    // teklifi kabul etti, usta zaten teklif vermişti) → CONFIRMED booking.
    // Best-effort: booking başarısız olsa da accept tamamlanır. Tarih job.dueDate,
    // yoksa bugüne ayarlanır (taraflar koordine eder).
    if (job && job.customerId) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const price = saved.price ?? 0;
        await this.bookingsRepository.save(
          this.bookingsRepository.create({
            jobId: job.id, // Booking↔Job bağı: booking durumu işe senkronlanır.
            customerId: job.customerId,
            workerId: saved.userId,
            category: job.category || 'Genel',
            subCategory: null,
            description: job.description || job.title || '',
            address: job.location || 'Belirtilmedi',
            scheduledDate: job.dueDate || today,
            scheduledTime: null,
            status: BookingStatus.CONFIRMED,
            agreedPrice: price,
            agreedPriceMinor: Math.round(price * 100),
          }),
        );
        // İş "Devam ediyor"a geçsin (open→in_progress geçerli) — İşlerim'de
        // hâlâ "Aktif" sekmesinde ama atanmış olarak görünür. Booking
        // completed/cancelled olunca BookingsService işi senkronlar.
        if (job.status === JobStatus.OPEN) {
          await this.jobsRepository.update(
            { id: job.id },
            { status: JobStatus.IN_PROGRESS },
          );
        }
      } catch (err) {
        this.logger.warn(
          `Auto-booking from accepted offer ${saved.id} failed: ${(err as Error).message}`,
        );
      }
    }

    return saved;
  }

  async reject(offerId: string): Promise<Offer> {
    const offer = await this._getOffer(offerId);
    offer.status = OfferStatus.REJECTED;
    const saved = await this.offersRepository.save(offer);
    await this.usersService.bumpStat(offer.userId, 'asWorkerFail');

    // Phase 253 — notify worker of rejection
    try {
      await this.notificationsService.send({
        userId: saved.userId,
        type: NotificationType.OFFER_REJECTED,
        title: 'Teklifin reddedildi',
        body: `${saved.price} ₺ teklifin reddedildi`,
        refId: saved.id,
        relatedType: 'job',
        relatedId: saved.jobId,
      });
    } catch (err) {
      this.logger.warn(
        `OFFER_REJECTED notification failed: ${(err as Error).message}`,
      );
    }

    return saved;
  }

  /**
   * Karşı-teklif yapar. Orijinal teklif COUNTERED olur ve yeni bir Offer
   * satırı parentOfferId ile zincire eklenir. Negotiation round otomatik artar.
   *
   * @param offerId  karşı-teklif yapılan orijinal Offer ID'si
   * @param byUserId  karşı-teklifi yapan kullanıcı (müşteri olabilir, usta da)
   * @param counterPrice  yeni öne sürülen fiyat
   * @param counterMessage  açıklama (opsiyonel)
   */
  async counter(
    offerId: string,
    byUserId: string,
    counterPrice: number,
    counterMessage: string,
    lineItems?: Array<{
      label: string;
      qty: number;
      unitPrice: number;
      total: number;
    }>,
  ): Promise<Offer> {
    this._assertLineItemsMatchPrice(lineItems, counterPrice);

    // Phase 262 — zincirin kökü ve son halkası. Re-counter daima leaf'e eklenir
    // (yanlış halkaya fork açılmasın); kök offer UI için tek anchor olarak senkronlanır.
    const root = await this._getChainRoot(offerId);
    const leaf = await this._getChainLeaf(root.id);
    const job = await this.jobsRepository.findOne({
      where: { id: root.jobId },
    });

    // Phase 507 (M3) — Counter sadece ilan sahibi tarafından atılabilir.
    // Teklif veren artık karşı teklif yapamaz, yalnızca kabul/iptal eder.
    const isListingOwner = !!job && byUserId === job.customerId;
    if (!isListingOwner) {
      throw new ForbiddenException(
        'Karşı teklifi yalnızca ilan sahibi atabilir. Teklif veren yalnızca kabul veya iptal edebilir.',
      );
    }

    // Phase 507 (M4) — Aynı teklif zincirinde yalnızca 1 karşı teklif atılabilir.
    // Sayaç kök offer'da tutulur; >=1 ise yeni counter reddedilir.
    if ((root.counterCount ?? 0) >= 1) {
      throw new BadRequestException(
        'Bu teklife pazarlık hakkınızı kullandınız (en fazla 1 karşı teklif).',
      );
    }

    // Phase 507 (M7) — Karşı teklif de bütçenin %90 alt sınırına uymalı.
    this._assertMinPriceFloor(job, counterPrice);

    // Phase 262 — counter cost: ilan sahibi bedava (kural değişmedi).
    const counterCost = 0;

    // Son halkayı COUNTERED yap + counter alanlarını yaz (geriye dönük uyumluluk)
    leaf.status = OfferStatus.COUNTERED;
    leaf.counterPrice = counterPrice;
    leaf.counterPriceMinor = tlToMinor(counterPrice);
    leaf.counterMessage = counterMessage;
    await this.offersRepository.save(leaf);

    // Yeni teklif satırı (zincirin yeni halkası)
    const child = this.offersRepository.create({
      jobId: leaf.jobId,
      userId: byUserId,
      price: counterPrice,
      priceMinor: tlToMinor(counterPrice) ?? 0,
      message: counterMessage,
      parentOfferId: leaf.id,
      negotiationRound: (leaf.negotiationRound ?? 0) + 1,
      lineItems: lineItems && lineItems.length > 0 ? lineItems : null,
      status: OfferStatus.PENDING,
      // Phase 287 — child kaydının tokenCost'u counter için ödenen miktar
      // (refund mantığı withdraw'da child halkalarını da bu üzerinden iade
      // edebilsin diye saklanır). isListingOwner / abone → 0.
      tokenCost: counterCost,
    });
    const saved = await this.offersRepository.save(child);

    // Kök offer'ı son tura senkronla — UI root-only kart gösterir, en güncel
    // karşı teklif fiyatı/mesajı kökte tutulur.
    if (root.id !== leaf.id) {
      root.status = OfferStatus.COUNTERED;
      root.counterPrice = counterPrice;
      root.counterPriceMinor = tlToMinor(counterPrice);
      root.counterMessage = counterMessage;
    }
    // Phase 507 (M4) — counter sayacı kökte tutulur; sonraki counter denemesi reddedilecek.
    root.counterCount = (root.counterCount ?? 0) + 1;
    await this.offersRepository.save(root);

    // Notify the OTHER party — usta counter'lıyorsa müşteriye, müşteri counter'lıyorsa ustaya
    try {
      const recipientId =
        byUserId === job?.customerId ? root.userId : job?.customerId;
      if (recipientId && job) {
        await this.notificationsService.send({
          userId: recipientId,
          type: NotificationType.COUNTER_OFFER,
          title: 'Karşı teklif geldi',
          body: `"${job.title}" ilanına ${counterPrice} ₺ karşı teklif yapıldı`,
          refId: saved.id,
          // Phase 71 — refId is offerId, but deep link should land on the job
          relatedType: 'job',
          relatedId: job.id,
        });
      }
    } catch {
      /* notification opsiyonel — sessiz geç */
    }

    return saved;
  }

  /**
   * Phase 262 — Karşı tarafın yaptığı en son (leaf) karşı teklifi kabul eder.
   * İki marketplace yönünde de çalışır: teklif veren VEYA ilan sahibi, kendisine
   * gelen son teklifi kabul edebilir. Anlaşılan fiyat (leaf.price) kök teklife
   * yazılır, ara halkalar REJECTED yapılır ve mevcut accept() çağrılır — booking,
   * escrow, bildirim ve istatistik bump'ı aynen çalışır (rol atamasına dokunulmaz).
   */
  async acceptCounter(offerId: string, byUserId: string): Promise<Offer> {
    const root = await this._getChainRoot(offerId);
    const leaf = await this._getChainLeaf(root.id);

    // Phase 262 — yetki: yalnızca pazarlığın iki tarafı (ilan sahibi VEYA asıl
    // teklif veren) kabul edebilir. Üçüncü şahıs offerId'yi bilse de kabul edemez.
    const job = await this.jobsRepository.findOne({
      where: { id: root.jobId },
    });
    const isParty =
      !!job && (byUserId === job.customerId || byUserId === root.userId);
    if (!isParty) {
      throw new ForbiddenException('Bu pazarlığa taraf değilsiniz');
    }

    if (leaf.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Kabul edilecek aktif bir karşı teklif yok');
    }
    if (leaf.userId === byUserId) {
      throw new BadRequestException(
        'Kendi teklifinizi kabul edemezsiniz; karşı tarafın yanıtını bekleyin',
      );
    }

    const agreedPrice = leaf.price;

    // Zincirdeki tüm halkaları (kök hariç) REJECTED yap — dangling pending kalmasın.
    const chain = await this.getNegotiationChain(leaf.id); // root..leaf
    for (const link of chain) {
      if (link.id === root.id) continue;
      if (link.status !== OfferStatus.REJECTED) {
        link.status = OfferStatus.REJECTED;
        await this.offersRepository.save(link);
      }
    }

    // Anlaşılan fiyatı köke yaz; accept() PENDING→ACCEPTED geçişini ve
    // booking/escrow'u kök offer (= asıl teklif veren) üzerinden yürütür.
    root.price = agreedPrice;
    root.priceMinor = tlToMinor(agreedPrice) ?? 0;
    if (root.status === OfferStatus.COUNTERED) {
      root.status = OfferStatus.PENDING;
    }
    await this.offersRepository.save(root);

    return this.accept(root.id, byUserId);
  }

  /** Phase 262 — Zincirin kökü (parentOfferId == null) — yukarı yürü. */
  private async _getChainRoot(offerId: string): Promise<Offer> {
    let current = await this._getOffer(offerId);
    while (current.parentOfferId) {
      const parent = await this.offersRepository.findOne({
        where: { id: current.parentOfferId },
      });
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  /** Phase 262 — Zincirin son halkası (child'ı olmayan) — aşağı yürü. */
  private async _getChainLeaf(offerId: string): Promise<Offer> {
    let current = await this._getOffer(offerId);
    for (;;) {
      const child = await this.offersRepository.findOne({
        where: { parentOfferId: current.id },
        order: { negotiationRound: 'DESC', createdAt: 'DESC' },
      });
      if (!child) break;
      current = child;
    }
    return current;
  }

  /**
   * Bir teklifin tüm pazarlık zincirini döndürür (en eskiden en yeniye).
   * `getNegotiationChain(latest.id)` → root'a kadar tüm parents.
   */
  async getNegotiationChain(offerId: string): Promise<Offer[]> {
    const chain: Offer[] = [];
    let current: Offer | null = await this._getOffer(offerId);
    while (current) {
      chain.unshift(current); // root → leaf sırası
      if (!current.parentOfferId) break;
      current = await this.offersRepository.findOne({
        where: { id: current.parentOfferId },
      });
    }
    return chain;
  }

  async updateStatus(id: string, status: OfferStatus): Promise<Offer> {
    const offer = await this._getOffer(id);
    const prev = offer.status;
    offer.status = status;
    const saved = await this.offersRepository.save(offer);
    if (prev !== status) {
      if (status === OfferStatus.ACCEPTED)
        await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');
      if (status === OfferStatus.REJECTED)
        await this.usersService.bumpStat(offer.userId, 'asWorkerFail');
    }
    return saved;
  }

  private async _getOffer(id: string): Promise<Offer> {
    const offer = await this.offersRepository.findOne({ where: { id } });
    if (!offer) throw new NotFoundException(`Teklif bulunamadı: #${id}`);
    return offer;
  }
}
