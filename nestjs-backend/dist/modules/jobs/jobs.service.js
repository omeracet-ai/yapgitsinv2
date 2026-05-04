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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("./job.entity");
const offer_entity_1 = require("./offer.entity");
const users_service_1 = require("../users/users.service");
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';
let JobsService = class JobsService {
    jobsRepository;
    offersRepository;
    usersService;
    constructor(jobsRepository, offersRepository, usersService) {
        this.jobsRepository = jobsRepository;
        this.offersRepository = offersRepository;
        this.usersService = usersService;
    }
    async onModuleInit() {
        const seedUser = await this.usersService.findByEmail('seed@hizmet.app');
        if (!seedUser) {
            await this.usersService.create({
                id: SEED_USER_ID,
                fullName: 'Seed User',
                phoneNumber: '05555555555',
                email: 'seed@hizmet.app',
                passwordHash: 'hashed_password',
            });
        }
        const count = await this.jobsRepository.count();
        if (count === 0) {
            const userId = seedUser?.id ?? SEED_USER_ID;
            await this.jobsRepository.save([
                {
                    title: 'Salon Badana',
                    description: '3+1 daire, düz boya yeterli. Malzeme bizden.',
                    category: 'Boya & Badana',
                    location: 'Kadıköy, İstanbul',
                    budgetMin: 500,
                    budgetMax: 1500,
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
                {
                    title: 'Mutfak Musluk Tamiri',
                    description: 'Musluk su kaçırıyor, conta değişimi veya yenileme gerek.',
                    category: 'Tesisat',
                    location: 'Beşiktaş, İstanbul',
                    budgetMin: 100,
                    budgetMax: 300,
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
                {
                    title: 'Haftalık Ev Temizliği',
                    description: 'Her Cuma günü rutin ev temizliği yapılacak.',
                    category: 'Temizlik',
                    location: 'Üsküdar, İstanbul',
                    budgetMin: 800,
                    budgetMax: 1200,
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
            ]);
        }
    }
    async findAll(filters) {
        const query = this.jobsRepository.createQueryBuilder('job');
        if (filters?.category) {
            query.andWhere('job.category = :category', { category: filters.category });
        }
        if (filters?.status) {
            query.andWhere('job.status = :status', { status: filters.status });
        }
        if (filters?.customerId) {
            query.andWhere('job.customerId = :customerId', { customerId: filters.customerId });
        }
        query
            .orderBy('CASE WHEN job.featuredOrder IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
            .addOrderBy('job.featuredOrder', 'ASC')
            .addOrderBy('job.createdAt', 'DESC');
        if (filters?.limit) {
            query.take(filters.limit);
        }
        return query.getMany();
    }
    async setFeaturedOrder(id, featuredOrder) {
        const job = await this.findOne(id);
        job.featuredOrder = featuredOrder;
        return this.jobsRepository.save(job);
    }
    async findOne(id) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        const customer = await this.usersService.findById(job.customerId);
        if (customer) {
            const { passwordHash, ...safe } = customer;
            return {
                ...job,
                customer: {
                    id: safe.id,
                    fullName: safe.fullName,
                    profileImageUrl: safe.profileImageUrl,
                    averageRating: safe.averageRating ?? 0,
                    totalReviews: safe.totalReviews ?? 0,
                    reputationScore: safe.reputationScore ?? 0,
                    city: safe.city ?? '',
                    createdAt: safe.createdAt,
                },
            };
        }
        return job;
    }
    async create(createJobDto, customerId) {
        const job = this.jobsRepository.create({ ...createJobDto, customerId, status: job_entity_1.JobStatus.OPEN });
        return this.jobsRepository.save(job);
    }
    async update(id, updateJobDto) {
        const job = await this.findOne(id);
        const prevStatus = job.status;
        Object.assign(job, updateJobDto);
        const saved = await this.jobsRepository.save(job);
        if (updateJobDto.status && updateJobDto.status !== prevStatus) {
            await this._trackStatusChange(saved.id, saved.customerId, prevStatus, saved.status);
        }
        return saved;
    }
    async _trackStatusChange(jobId, customerId, prev, next) {
        if (next === job_entity_1.JobStatus.COMPLETED) {
            if (prev !== job_entity_1.JobStatus.COMPLETED)
                await this.usersService.bumpStat(customerId, 'asCustomerTotal');
            await this.usersService.bumpStat(customerId, 'asCustomerSuccess');
            await this.usersService.recalcReputation(customerId);
            const acceptedOffer = await this.offersRepository.findOne({
                where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
            });
            if (acceptedOffer) {
                await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerSuccess');
                await this.usersService.recalcReputation(acceptedOffer.userId);
            }
        }
        else if (next === job_entity_1.JobStatus.CANCELLED) {
            if (prev !== job_entity_1.JobStatus.CANCELLED)
                await this.usersService.bumpStat(customerId, 'asCustomerTotal');
            await this.usersService.bumpStat(customerId, 'asCustomerFail');
            await this.usersService.recalcReputation(customerId);
            const acceptedOffer = await this.offersRepository.findOne({
                where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
            });
            if (acceptedOffer) {
                await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerFail');
                await this.usersService.recalcReputation(acceptedOffer.userId);
            }
        }
    }
    async remove(id) {
        const job = await this.findOne(id);
        await this.jobsRepository.remove(job);
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map