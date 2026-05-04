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
exports.ServiceRequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const service_request_entity_1 = require("./service-request.entity");
const service_request_application_entity_1 = require("./service-request-application.entity");
let ServiceRequestsService = class ServiceRequestsService {
    repo;
    appRepo;
    constructor(repo, appRepo) {
        this.repo = repo;
        this.appRepo = appRepo;
    }
    findAll(category) {
        const qb = this.repo
            .createQueryBuilder('sr')
            .leftJoinAndSelect('sr.user', 'user')
            .where('sr.status = :status', { status: 'open' })
            .orderBy(`CASE WHEN sr.featuredOrder IS NOT NULL THEN sr.featuredOrder ELSE 999 END`, 'ASC')
            .addOrderBy('sr.createdAt', 'DESC');
        if (category) {
            qb.andWhere('sr.category = :category', { category });
        }
        return qb.getMany();
    }
    findById(id) {
        return this.repo.findOne({ where: { id }, relations: ['user'] });
    }
    findByUser(userId) {
        return this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async create(userId, data) {
        const sr = this.repo.create({ ...data, userId });
        return this.repo.save(sr);
    }
    async update(id, userId, data) {
        const sr = await this.repo.findOne({ where: { id } });
        if (!sr)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (sr.userId !== userId)
            throw new common_1.ForbiddenException('Yetkisiz');
        Object.assign(sr, data);
        return this.repo.save(sr);
    }
    async remove(id, userId) {
        const sr = await this.repo.findOne({ where: { id } });
        if (!sr)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (sr.userId !== userId)
            throw new common_1.ForbiddenException('Yetkisiz');
        await this.repo.delete(id);
    }
    async setFeaturedOrder(id, featuredOrder) {
        await this.repo.update(id, { featuredOrder });
    }
    async createApplication(serviceRequestId, userId, data) {
        const sr = await this.repo.findOne({ where: { id: serviceRequestId } });
        if (!sr)
            throw new common_1.NotFoundException('Hizmet ilanı bulunamadı');
        if (sr.userId === userId)
            throw new common_1.ForbiddenException('Kendi ilanınıza başvuramazsınız');
        const app = this.appRepo.create({
            serviceRequestId,
            userId,
            message: data.message ?? null,
            price: data.price ?? null,
            status: service_request_application_entity_1.ApplicationStatus.PENDING,
        });
        return this.appRepo.save(app);
    }
    async getApplications(serviceRequestId) {
        return this.appRepo.find({
            where: { serviceRequestId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
    }
    async getMyApplications(userId) {
        return this.appRepo.find({
            where: { userId },
            relations: ['serviceRequest'],
            order: { createdAt: 'DESC' },
        });
    }
    async updateApplicationStatus(applicationId, requestUserId, status) {
        const app = await this.appRepo.findOne({ where: { id: applicationId }, relations: ['serviceRequest'] });
        if (!app)
            throw new common_1.NotFoundException('Başvuru bulunamadı');
        if (app.serviceRequest.userId !== requestUserId)
            throw new common_1.ForbiddenException('Yetkisiz');
        app.status = status;
        return this.appRepo.save(app);
    }
};
exports.ServiceRequestsService = ServiceRequestsService;
exports.ServiceRequestsService = ServiceRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(service_request_entity_1.ServiceRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(service_request_application_entity_1.ServiceRequestApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ServiceRequestsService);
//# sourceMappingURL=service-requests.service.js.map