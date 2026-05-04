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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
const service_request_entity_1 = require("../service-requests/service-request.entity");
let AdminService = class AdminService {
    jobsRepo;
    usersRepo;
    srRepo;
    constructor(jobsRepo, usersRepo, srRepo) {
        this.jobsRepo = jobsRepo;
        this.usersRepo = usersRepo;
        this.srRepo = srRepo;
    }
    async getDashboardStats() {
        const [totalJobs, totalUsers, totalServiceRequests, openServiceRequests] = await Promise.all([
            this.jobsRepo.count(),
            this.usersRepo.count(),
            this.srRepo.count(),
            this.srRepo.count({ where: { status: 'open' } }),
        ]);
        return { totalJobs, totalUsers, totalServiceRequests, openServiceRequests };
    }
    async getRecentJobs(limit = 20) {
        return this.jobsRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['customer'],
        });
    }
    async getAllUsers() {
        return this.usersRepo.find({
            order: { createdAt: 'DESC' },
            select: ['id', 'fullName', 'email', 'phoneNumber', 'isPhoneVerified', 'identityVerified', 'city', 'createdAt'],
        });
    }
    async getAllServiceRequests(limit = 50) {
        return this.srRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }
    async setServiceRequestFeaturedOrder(id, featuredOrder) {
        return this.srRepo.update(id, { featuredOrder });
    }
    async setJobFeaturedOrder(id, featuredOrder) {
        return this.jobsRepo.update(id, { featuredOrder });
    }
    async verifyUser(id, identityVerified) {
        return this.usersRepo.update(id, { identityVerified });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(service_request_entity_1.ServiceRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map