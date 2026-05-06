"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const crypto = __importStar(require("crypto"));
const job_entity_1 = require("./job.entity");
const offer_entity_1 = require("./offer.entity");
const users_service_1 = require("../users/users.service");
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';
let JobsService = class JobsService {
    jobsRepository;
    offersRepository;
    usersService;
    dataSource;
    constructor(jobsRepository, offersRepository, usersService, dataSource) {
        this.jobsRepository = jobsRepository;
        this.offersRepository = offersRepository;
        this.usersService = usersService;
        this.dataSource = dataSource;
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
        const limit = filters?.limit ?? 20;
        const page = filters?.page ?? 1;
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
            .addOrderBy('job.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await query.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async setFeaturedOrder(id, featuredOrder) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        job.featuredOrder = featuredOrder;
        return this.jobsRepository.save(job);
    }
    async findOne(id) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        const customer = await this.usersService.findById(job.customerId);
        if (customer) {
            const { passwordHash: _ph, ...safe } = customer;
            job.customer = {
                id: safe.id,
                fullName: safe.fullName,
                profileImageUrl: safe.profileImageUrl,
                averageRating: safe.averageRating ?? 0,
                totalReviews: safe.totalReviews ?? 0,
                reputationScore: safe.reputationScore ?? 0,
                city: safe.city ?? '',
                createdAt: safe.createdAt,
                identityVerified: safe.identityVerified ?? false,
                asCustomerTotal: safe.asCustomerTotal ?? 0,
                asCustomerSuccess: safe.asCustomerSuccess ?? 0,
            };
        }
        return job;
    }
    async create(createJobDto, customerId) {
        const job = this.jobsRepository.create({
            ...createJobDto,
            customerId,
            status: job_entity_1.JobStatus.OPEN,
        });
        return this.jobsRepository.save(job);
    }
    async update(id, updateJobDto, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        if (requesterId && job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Bu ilanı düzenleme yetkiniz yok.');
        }
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
    async findNearby(lat, lng, radiusKm = 20, category) {
        const haversine = `(6371 * acos(
      cos(radians(?)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(?)) +
      sin(radians(?)) * sin(radians(j.latitude))
    ))`;
        let sql = `
      SELECT j.*, ${haversine} AS distanceKm
      FROM jobs j
      WHERE j.latitude IS NOT NULL
        AND j.longitude IS NOT NULL
        AND j.status = 'open'
        AND ${haversine} <= ?
    `;
        const params = [lat, lng, lat, lat, lng, lat, radiusKm];
        if (category) {
            sql += ` AND LOWER(j.category) = LOWER(?)`;
            params.push(category);
        }
        sql += ` ORDER BY distanceKm ASC LIMIT 50`;
        const rows = await this.dataSource.query(sql, params);
        return rows;
    }
    async remove(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        if (requesterId && job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Bu ilanı silme yetkiniz yok.');
        }
        await this.jobsRepository.remove(job);
    }
    async generateQr(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Yalnızca müşteri QR kod oluşturabilir.');
        }
        if (job.status !== job_entity_1.JobStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('QR kod sadece devam eden işler için oluşturulabilir.');
        }
        const qrCode = crypto.randomUUID();
        job.qrCode = qrCode;
        await this.jobsRepository.save(job);
        return { qrCode };
    }
    async verifyQr(id, qrCode, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.customerId === requesterId) {
            throw new common_1.ForbiddenException('QR kodu usta taramalıdır.');
        }
        if (!job.qrCode || job.qrCode !== qrCode) {
            throw new common_1.BadRequestException('Geçersiz QR kod.');
        }
        job.isQrVerified = true;
        await this.jobsRepository.save(job);
        return { success: true };
    }
    async completeJobWithPayment(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (!job.isQrVerified) {
            throw new common_1.BadRequestException('İşi tamamlamadan önce müşterinin QR kodunu taramalısınız.');
        }
        const hasPhotos = job.endJobPhotos && job.endJobPhotos.length > 0;
        const hasVideos = job.endJobVideos && job.endJobVideos.length > 0;
        if (!hasPhotos && !hasVideos) {
            throw new common_1.BadRequestException('İşi tamamlamak için en az bir adet iş sonu görseli veya videosu eklemelisiniz.');
        }
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId: id, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        if (!acceptedOffer) {
            throw new common_1.BadRequestException('Bu işe ait kabul edilmiş bir teklif bulunamadı.');
        }
        const jobPrice = acceptedOffer.counterPrice || acceptedOffer.price;
        const platformCommissionRate = 0.10;
        const commissionAmount = jobPrice * platformCommissionRate;
        const workerAmount = jobPrice - commissionAmount;
        console.log(`[BANKA İŞLEMİ] İlan: ${job.id}`);
        console.log(`- Müşteriden Çekilen Tutar: ${jobPrice} ₺`);
        console.log(`- Platform Komisyonu (%10): ${commissionAmount.toFixed(2)} ₺`);
        console.log(`- Ustaya Aktarılacak Tutar: ${workerAmount.toFixed(2)} ₺`);
        const prevStatus = job.status;
        job.status = job_entity_1.JobStatus.COMPLETED;
        const saved = await this.jobsRepository.save(job);
        await this._trackStatusChange(saved.id, saved.customerId, prevStatus, saved.status);
        return saved;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        typeorm_2.DataSource])
], JobsService);
//# sourceMappingURL=jobs.service.js.map