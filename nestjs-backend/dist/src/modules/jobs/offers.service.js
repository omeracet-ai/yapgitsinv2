"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OffersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const offer_entity_1 = require("./offer.entity");
const job_entity_1 = require("./job.entity");
const tokens_service_1 = require("../tokens/tokens.service");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const user_entity_1 = require("../users/user.entity");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const escrow_service_1 = require("../escrow/escrow.service");
const user_blocks_service_1 = require("../user-blocks/user-blocks.service");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const money_util_1 = require("../../common/money.util");
let OffersService = OffersService_1 = class OffersService {
    offersRepository;
    jobsRepository;
    tokensService;
    usersService;
    notificationsService;
    escrowService;
    userBlocksService;
    subscriptionsService;
    dataSource;
    logger = new common_1.Logger(OffersService_1.name);
    constructor(offersRepository, jobsRepository, tokensService, usersService, notificationsService, escrowService, userBlocksService, subscriptionsService, dataSource) {
        this.offersRepository = offersRepository;
        this.jobsRepository = jobsRepository;
        this.tokensService = tokensService;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.escrowService = escrowService;
        this.userBlocksService = userBlocksService;
        this.subscriptionsService = subscriptionsService;
        this.dataSource = dataSource;
    }
    async withdrawOffer(jobId, offerId, userId) {
        return this.dataSource.transaction(async (manager) => {
            const offer = await manager.findOne(offer_entity_1.Offer, { where: { id: offerId } });
            if (!offer)
                throw new common_1.NotFoundException(`Teklif bulunamadı: #${offerId}`);
            if (offer.jobId !== jobId) {
                throw new common_1.BadRequestException('Teklif bu ilana ait değil');
            }
            if (offer.userId !== userId) {
                throw new common_1.ForbiddenException('Sadece teklif sahibi geri çekebilir');
            }
            if (offer.status !== offer_entity_1.OfferStatus.PENDING &&
                offer.status !== offer_entity_1.OfferStatus.COUNTERED) {
                throw new common_1.BadRequestException(`Bu teklif geri çekilemez (durum: ${offer.status})`);
            }
            const job = await manager.findOne(job_entity_1.Job, { where: { id: jobId } });
            if (!job)
                throw new common_1.NotFoundException('İlan bulunamadı');
            if (job.status !== job_entity_1.JobStatus.OPEN) {
                throw new common_1.BadRequestException(`İlan açık değil, teklif geri çekilemez (durum: ${job.status})`);
            }
            offer.status = offer_entity_1.OfferStatus.WITHDRAWN;
            await manager.save(offer_entity_1.Offer, offer);
            const isSubscriber = await this.subscriptionsService.isActiveSubscriber(userId);
            const refundAmount = isSubscriber ? 0 : tokens_service_1.OFFER_TOKEN_COST;
            if (refundAmount > 0) {
                await manager.increment(user_entity_1.User, { id: userId }, 'tokenBalance', refundAmount);
                await manager.save(token_transaction_entity_1.TokenTransaction, manager.create(token_transaction_entity_1.TokenTransaction, {
                    userId,
                    type: token_transaction_entity_1.TxType.REFUND,
                    amount: refundAmount,
                    description: 'Teklif iptali iadesi',
                    status: token_transaction_entity_1.TxStatus.COMPLETED,
                    paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                    paymentRef: `WITHDRAW-${offerId.slice(0, 8)}`,
                }));
            }
            return {
                id: offer.id,
                status: offer.status,
                refunded: refundAmount > 0,
                refundAmount,
            };
        });
    }
    async findByJob(jobId) {
        const offers = await this.offersRepository.find({
            where: { jobId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
        if (offers.length === 0)
            return offers;
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job?.customerId)
            return offers;
        const blockedIds = await this.userBlocksService.listBlockedIds(job.customerId);
        if (blockedIds.length === 0)
            return offers;
        const blockedSet = new Set(blockedIds);
        return offers.filter((o) => !blockedSet.has(o.userId));
    }
    async findByUser(userId, page = 1, limit = 20) {
        const [data, total] = await this.offersRepository.findAndCount({
            where: { userId },
            relations: ['job'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findByProvider(userId) {
        return (await this.findByUser(userId)).data;
    }
    async findOffersByCustomer(customerId) {
        return this.offersRepository
            .createQueryBuilder('offer')
            .innerJoinAndSelect('offer.job', 'job')
            .leftJoinAndSelect('offer.user', 'user')
            .where('job.customerId = :customerId', { customerId })
            .orderBy('offer.createdAt', 'DESC')
            .take(30)
            .getMany();
    }
    async create(data) {
        this._assertLineItemsMatchPrice(data.lineItems, data.price);
        const isSubscriber = await this.subscriptionsService.isActiveSubscriber(data.userId);
        if (!isSubscriber) {
            await this.tokensService.spend(data.userId, tokens_service_1.OFFER_TOKEN_COST, `İlan #${data.jobId.slice(0, 8)} için teklif (${data.price} ₺)`);
        }
        await this.usersService.bumpStat(data.userId, 'asWorkerTotal');
        const offer = this.offersRepository.create({
            jobId: data.jobId,
            userId: data.userId,
            price: data.price,
            priceMinor: (0, money_util_1.tlToMinor)(data.price) ?? 0,
            message: data.message,
            attachmentUrls: this._sanitizeAttachments(data.attachmentUrls),
            lineItems: data.lineItems && data.lineItems.length > 0 ? data.lineItems : null,
            status: offer_entity_1.OfferStatus.PENDING,
        });
        return this.offersRepository.save(offer);
    }
    _assertLineItemsMatchPrice(lineItems, price) {
        if (!Array.isArray(lineItems) || lineItems.length === 0)
            return;
        const sum = lineItems.reduce((acc, it) => acc + Number(it.total || 0), 0);
        if (Math.abs(sum - price) > 1) {
            throw new common_1.BadRequestException('Kalemler toplamı fiyatla uyuşmuyor');
        }
    }
    _sanitizeAttachments(urls) {
        if (!Array.isArray(urls) || urls.length === 0)
            return null;
        const cleaned = urls
            .filter((u) => typeof u === 'string')
            .map((u) => u.trim())
            .filter((u) => /^https?:\/\//.test(u) && u.length <= 500);
        const unique = Array.from(new Set(cleaned)).slice(0, 5);
        return unique.length > 0 ? unique : null;
    }
    async accept(offerId, _requestUserId) {
        const offer = await this._getOffer(offerId);
        offer.status = offer_entity_1.OfferStatus.ACCEPTED;
        const saved = await this.offersRepository.save(offer);
        await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');
        try {
            const job = await this.jobsRepository.findOne({ where: { id: saved.jobId } });
            if (job && job.customerId) {
                await this.escrowService.hold({
                    jobId: saved.jobId,
                    offerId: saved.id,
                    amount: saved.price,
                    customerId: job.customerId,
                    taskerId: saved.userId,
                });
            }
            else {
                this.logger.warn(`Escrow hold skipped: job or customer missing for offer ${saved.id}`);
            }
        }
        catch (err) {
            this.logger.warn(`Escrow hold failed for offer ${saved.id}: ${err?.message ?? err}`);
        }
        return saved;
    }
    async reject(offerId) {
        const offer = await this._getOffer(offerId);
        offer.status = offer_entity_1.OfferStatus.REJECTED;
        const saved = await this.offersRepository.save(offer);
        await this.usersService.bumpStat(offer.userId, 'asWorkerFail');
        return saved;
    }
    async counter(offerId, byUserId, counterPrice, counterMessage, lineItems) {
        this._assertLineItemsMatchPrice(lineItems, counterPrice);
        const parent = await this._getOffer(offerId);
        parent.status = offer_entity_1.OfferStatus.COUNTERED;
        parent.counterPrice = counterPrice;
        parent.counterPriceMinor = (0, money_util_1.tlToMinor)(counterPrice);
        parent.counterMessage = counterMessage;
        await this.offersRepository.save(parent);
        const child = this.offersRepository.create({
            jobId: parent.jobId,
            userId: byUserId,
            price: counterPrice,
            priceMinor: (0, money_util_1.tlToMinor)(counterPrice) ?? 0,
            message: counterMessage,
            parentOfferId: parent.id,
            negotiationRound: (parent.negotiationRound ?? 0) + 1,
            lineItems: lineItems && lineItems.length > 0 ? lineItems : null,
            status: offer_entity_1.OfferStatus.PENDING,
        });
        const saved = await this.offersRepository.save(child);
        try {
            const job = await this.jobsRepository.findOne({ where: { id: parent.jobId } });
            const recipientId = byUserId === job?.customerId ? parent.userId : job?.customerId;
            if (recipientId && job) {
                await this.notificationsService.send({
                    userId: recipientId,
                    type: notification_entity_1.NotificationType.COUNTER_OFFER,
                    title: 'Karşı teklif geldi',
                    body: `"${job.title}" ilanına ${counterPrice} ₺ karşı teklif yapıldı`,
                    refId: saved.id,
                    relatedType: 'job',
                    relatedId: job.id,
                });
            }
        }
        catch { }
        return saved;
    }
    async getNegotiationChain(offerId) {
        const chain = [];
        let current = await this._getOffer(offerId);
        while (current) {
            chain.unshift(current);
            if (!current.parentOfferId)
                break;
            current = await this.offersRepository.findOne({ where: { id: current.parentOfferId } });
        }
        return chain;
    }
    async updateStatus(id, status) {
        const offer = await this._getOffer(id);
        const prev = offer.status;
        offer.status = status;
        const saved = await this.offersRepository.save(offer);
        if (prev !== status) {
            if (status === offer_entity_1.OfferStatus.ACCEPTED)
                await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');
            if (status === offer_entity_1.OfferStatus.REJECTED)
                await this.usersService.bumpStat(offer.userId, 'asWorkerFail');
        }
        return saved;
    }
    async _getOffer(id) {
        const offer = await this.offersRepository.findOne({ where: { id } });
        if (!offer)
            throw new common_1.NotFoundException(`Teklif bulunamadı: #${id}`);
        return offer;
    }
};
exports.OffersService = OffersService;
exports.OffersService = OffersService = OffersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        tokens_service_1.TokensService,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        escrow_service_1.EscrowService,
        user_blocks_service_1.UserBlocksService,
        subscriptions_service_1.SubscriptionsService,
        typeorm_2.DataSource])
], OffersService);
//# sourceMappingURL=offers.service.js.map