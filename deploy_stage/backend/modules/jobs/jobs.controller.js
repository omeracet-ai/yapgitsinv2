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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jobs_service_1 = require("./jobs.service");
const offers_service_1 = require("./offers.service");
const job_dto_1 = require("./dto/job.dto");
const job_entity_1 = require("./job.entity");
const offer_entity_1 = require("./offer.entity");
let JobsController = class JobsController {
    jobsService;
    offersService;
    constructor(jobsService, offersService) {
        this.jobsService = jobsService;
        this.offersService = offersService;
    }
    findAll(category, status, limit, page, customerId) {
        return this.jobsService.findAll({
            category,
            status,
            limit: limit ? Number(limit) : undefined,
            page: page ? Number(page) : undefined,
            customerId,
        });
    }
    getMyOffers(req, page, limit) {
        return this.offersService.findByUser(req.user.id, Number(page) || 1, Number(limit) || 20);
    }
    async getNotifications(req) {
        const userId = req.user.id;
        const { data: myOffers } = await this.offersService.findByUser(userId);
        const offerNotifs = myOffers
            .filter((o) => o.status !== offer_entity_1.OfferStatus.PENDING)
            .map((o) => ({
            id: o.id,
            type: o.status === offer_entity_1.OfferStatus.ACCEPTED
                ? 'offer_accepted'
                : o.status === offer_entity_1.OfferStatus.REJECTED
                    ? 'offer_rejected'
                    : o.status === offer_entity_1.OfferStatus.COUNTERED
                        ? 'offer_countered'
                        : 'offer_withdrawn',
            title: o.status === offer_entity_1.OfferStatus.ACCEPTED
                ? 'Teklifiniz Kabul Edildi 🎉'
                : o.status === offer_entity_1.OfferStatus.REJECTED
                    ? 'Teklifiniz Reddedildi'
                    : o.status === offer_entity_1.OfferStatus.COUNTERED
                        ? 'Pazarlık Teklifi Geldi'
                        : 'Teklif Güncellendi',
            body: `İlan için teklifiniz güncellendi: ${o.status}`,
            jobId: o.job?.id ?? null,
            jobTitle: o.job?.title ?? '',
            price: o.price,
            counterPrice: o.counterPrice,
            status: o.status,
            createdAt: o.updatedAt ?? o.createdAt,
        }));
        const receivedOffers = await this.offersService.findOffersByCustomer(userId);
        const receivedNotifs = receivedOffers.map((o) => {
            const user = o.user;
            const name = user?.fullName ?? 'Bir kullanıcı';
            const job = o.job;
            return {
                id: o.id,
                type: o.status === offer_entity_1.OfferStatus.PENDING
                    ? 'new_offer'
                    : o.status === offer_entity_1.OfferStatus.COUNTERED
                        ? 'offer_countered'
                        : 'offer_updated',
                title: o.status === offer_entity_1.OfferStatus.PENDING
                    ? 'Yeni Teklif Aldınız!'
                    : o.status === offer_entity_1.OfferStatus.COUNTERED
                        ? 'Pazarlık Teklifi'
                        : 'Teklif Güncellendi',
                body: `${name}, "${job?.title ?? 'ilanınız'}" için ${o.price} ₺ teklif verdi.`,
                jobId: job?.id ?? null,
                jobTitle: job?.title ?? '',
                price: o.price,
                counterPrice: o.counterPrice,
                status: o.status,
                createdAt: o.createdAt,
            };
        });
        return [...offerNotifs, ...receivedNotifs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    findNearby(lat, lng, radiusKm, category) {
        return this.jobsService.findNearby(parseFloat(lat), parseFloat(lng), radiusKm ? parseFloat(radiusKm) : 20, category);
    }
    findOne(id) {
        return this.jobsService.findOne(id);
    }
    create(createJobDto, req) {
        return this.jobsService.create(createJobDto, req.user.id);
    }
    update(id, updateJobDto, req) {
        return this.jobsService.update(id, updateJobDto, req.user.id);
    }
    remove(id, req) {
        return this.jobsService.remove(id, req.user.id);
    }
    generateQr(id, req) {
        return this.jobsService.generateQr(id, req.user.id);
    }
    verifyQr(id, qrCode, req) {
        return this.jobsService.verifyQr(id, qrCode, req.user.id);
    }
    completeJob(id, req) {
        return this.jobsService.completeJobWithPayment(id, req.user.id);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my-offers'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getMyOffers", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('nearby'),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __param(2, (0, common_1.Query)('radiusKm')),
    __param(3, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findNearby", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [job_dto_1.CreateJobDto, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, job_dto_1.UpdateJobDto, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/generate-qr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "generateQr", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/verify-qr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('qrCode')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "verifyQr", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "completeJob", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        offers_service_1.OffersService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map