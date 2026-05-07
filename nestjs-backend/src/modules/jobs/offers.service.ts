import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus } from './offer.entity';
import { Job } from './job.entity';
import { TokensService, OFFER_TOKEN_COST } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    private tokensService: TokensService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async findByJob(jobId: string): Promise<Offer[]> {
    return this.offersRepository.find({
      where: { jobId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
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
  }): Promise<Offer> {
    await this.tokensService.spend(
      data.userId,
      OFFER_TOKEN_COST,
      `İlan #${data.jobId.slice(0, 8)} için teklif (${data.price} ₺)`,
    );
    await this.usersService.bumpStat(data.userId, 'asWorkerTotal');
    const offer = this.offersRepository.create({
      jobId: data.jobId,
      userId: data.userId,
      price: data.price,
      message: data.message,
      attachmentUrls: this._sanitizeAttachments(data.attachmentUrls),
      status: OfferStatus.PENDING,
    });
    return this.offersRepository.save(offer);
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
    const offer = await this._getOffer(offerId);
    offer.status = OfferStatus.ACCEPTED;
    const saved = await this.offersRepository.save(offer);
    await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');
    return saved;
  }

  async reject(offerId: string): Promise<Offer> {
    const offer = await this._getOffer(offerId);
    offer.status = OfferStatus.REJECTED;
    const saved = await this.offersRepository.save(offer);
    await this.usersService.bumpStat(offer.userId, 'asWorkerFail');
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
  ): Promise<Offer> {
    const parent = await this._getOffer(offerId);

    // Eski API geriye dönük: parent satırına da counterPrice/Message yaz, status COUNTERED
    parent.status = OfferStatus.COUNTERED;
    parent.counterPrice = counterPrice;
    parent.counterMessage = counterMessage;
    await this.offersRepository.save(parent);

    // Yeni teklif satırı (zincirin yeni halkası)
    const child = this.offersRepository.create({
      jobId: parent.jobId,
      userId: byUserId,
      price: counterPrice,
      message: counterMessage,
      parentOfferId: parent.id,
      negotiationRound: (parent.negotiationRound ?? 0) + 1,
      status: OfferStatus.PENDING,
    });
    const saved = await this.offersRepository.save(child);

    // Notify the OTHER party — usta counter'lıyorsa müşteriye, müşteri counter'lıyorsa ustaya
    try {
      const job = await this.jobsRepository.findOne({ where: { id: parent.jobId } });
      const recipientId = byUserId === job?.customerId ? parent.userId : job?.customerId;
      if (recipientId && job) {
        await this.notificationsService.send({
          userId: recipientId,
          type: NotificationType.COUNTER_OFFER,
          title: 'Karşı teklif geldi',
          body: `"${job.title}" ilanına ${counterPrice} ₺ karşı teklif yapıldı`,
          refId: saved.id,
        });
      }
    } catch { /* notification opsiyonel — sessiz geç */ }

    return saved;
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
      current = await this.offersRepository.findOne({ where: { id: current.parentOfferId } });
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
