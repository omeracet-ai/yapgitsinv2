import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus } from './offer.entity';
import { TokensService, OFFER_TOKEN_COST } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    private tokensService: TokensService,
    private usersService: UsersService,
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

  async counter(
    offerId: string,
    counterPrice: number,
    counterMessage: string,
  ): Promise<Offer> {
    const offer = await this._getOffer(offerId);
    offer.status = OfferStatus.COUNTERED;
    offer.counterPrice = counterPrice;
    offer.counterMessage = counterMessage;
    return this.offersRepository.save(offer);
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
