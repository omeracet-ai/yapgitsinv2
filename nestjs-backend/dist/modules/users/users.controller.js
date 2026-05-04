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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const passport_1 = require("@nestjs/passport");
const users_service_1 = require("./users.service");
const job_entity_1 = require("../jobs/job.entity");
const review_entity_1 = require("../reviews/review.entity");
const offer_entity_1 = require("../jobs/offer.entity");
let UsersController = class UsersController {
    svc;
    jobsRepo;
    reviewsRepo;
    offersRepo;
    constructor(svc, jobsRepo, reviewsRepo, offersRepo) {
        this.svc = svc;
        this.jobsRepo = jobsRepo;
        this.reviewsRepo = reviewsRepo;
        this.offersRepo = offersRepo;
    }
    async getMe(req) {
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const { passwordHash, ...safe } = user;
        return safe;
    }
    async updateMe(req, body) {
        const updated = await this.svc.update(req.user.id, body);
        if (!updated)
            return null;
        const { passwordHash, ...safe } = updated;
        return safe;
    }
    async getWorkers(category, city) {
        const all = await this.svc.findAll();
        const workers = all.filter(u => u.isAvailable &&
            u.workerCategories?.length &&
            (category ? u.workerCategories.includes(category) : true) &&
            (city ? u.city?.toLowerCase().includes(city.toLowerCase()) : true));
        return workers.map(u => {
            const { passwordHash, ...safe } = u;
            return safe;
        });
    }
    async getPublicProfile(id) {
        const user = await this.svc.findById(id);
        if (!user)
            return null;
        const reviews = await this.reviewsRepo.find({
            where: { revieweeId: id },
            relations: ['reviewer'],
            order: { createdAt: 'DESC' },
            take: 10,
        });
        const customerJobs = await this.jobsRepo.find({
            where: { customerId: id, status: job_entity_1.JobStatus.COMPLETED },
            order: { updatedAt: 'DESC' },
            take: 20,
        });
        const acceptedOffers = await this.offersRepo.find({
            where: { userId: id, status: offer_entity_1.OfferStatus.ACCEPTED },
            relations: ['job'],
            order: { updatedAt: 'DESC' },
            take: 20,
        });
        const workerJobs = acceptedOffers
            .map(o => o.job)
            .filter(j => j && j.status === job_entity_1.JobStatus.COMPLETED);
        const allPhotoJobs = [...customerJobs, ...workerJobs];
        const pastPhotos = [];
        for (const job of allPhotoJobs) {
            if (pastPhotos.length >= 4)
                break;
            if (job?.photos?.length) {
                pastPhotos.push(...job.photos.slice(0, 4 - pastPhotos.length));
            }
        }
        const avgRating = reviews.length
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : 0;
        const reputation = Math.round(avgRating * 20)
            + (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
        const { passwordHash, ...safe } = user;
        return {
            ...safe,
            averageRating: avgRating,
            totalReviews: reviews.length,
            reputationScore: reputation,
            reviews: reviews.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                reviewer: {
                    id: r.reviewer?.id,
                    fullName: r.reviewer?.fullName,
                    profileImageUrl: r.reviewer?.profileImageUrl,
                },
            })),
            pastPhotos,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Get)('workers'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getWorkers", null);
__decorate([
    (0, common_1.Get)(':id/profile'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicProfile", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(3, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersController);
//# sourceMappingURL=users.controller.js.map