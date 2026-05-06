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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const offer_entity_1 = require("./offer.entity");
const tokens_service_1 = require("../tokens/tokens.service");
const users_service_1 = require("../users/users.service");
let OffersService = class OffersService {
    offersRepository;
    tokensService;
    usersService;
    constructor(offersRepository, tokensService, usersService) {
        this.offersRepository = offersRepository;
        this.tokensService = tokensService;
        this.usersService = usersService;
    }
    async findByJob(jobId) {
        return this.offersRepository.find({
            where: { jobId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
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
        await this.tokensService.spend(data.userId, tokens_service_1.OFFER_TOKEN_COST, `İlan #${data.jobId.slice(0, 8)} için teklif (${data.price} ₺)`);
        await this.usersService.bumpStat(data.userId, 'asWorkerTotal');
        const offer = this.offersRepository.create({
            jobId: data.jobId,
            userId: data.userId,
            price: data.price,
            message: data.message,
            status: offer_entity_1.OfferStatus.PENDING,
        });
        return this.offersRepository.save(offer);
    }
    async accept(offerId, _requestUserId) {
        const offer = await this._getOffer(offerId);
        offer.status = offer_entity_1.OfferStatus.ACCEPTED;
        const saved = await this.offersRepository.save(offer);
        await this.usersService.bumpStat(offer.userId, 'asWorkerSuccess');
        return saved;
    }
    async reject(offerId) {
        const offer = await this._getOffer(offerId);
        offer.status = offer_entity_1.OfferStatus.REJECTED;
        const saved = await this.offersRepository.save(offer);
        await this.usersService.bumpStat(offer.userId, 'asWorkerFail');
        return saved;
    }
    async counter(offerId, counterPrice, counterMessage) {
        const offer = await this._getOffer(offerId);
        offer.status = offer_entity_1.OfferStatus.COUNTERED;
        offer.counterPrice = counterPrice;
        offer.counterMessage = counterMessage;
        return this.offersRepository.save(offer);
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
exports.OffersService = OffersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        tokens_service_1.TokensService,
        users_service_1.UsersService])
], OffersService);
//# sourceMappingURL=offers.service.js.map