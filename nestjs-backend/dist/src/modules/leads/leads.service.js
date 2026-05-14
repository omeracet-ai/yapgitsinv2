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
var LeadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lead_request_entity_1 = require("./lead-request.entity");
let LeadsService = LeadsService_1 = class LeadsService {
    repo;
    logger = new common_1.Logger(LeadsService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto, meta) {
        if (dto.website && dto.website.trim().length > 0) {
            this.logger.warn(`[leads] honeypot triggered (ip=${meta.ipAddress ?? 'n/a'})`);
            return { id: 'honeypot', status: 'spam' };
        }
        const entity = this.repo.create({
            name: dto.name.trim(),
            phoneNumber: dto.phoneNumber.trim(),
            email: dto.email?.trim() || null,
            message: dto.message.trim(),
            category: dto.category?.trim() || null,
            targetWorkerId: dto.targetWorkerId || null,
            source: (dto.source || 'landing'),
            status: 'new',
            ipAddress: meta.ipAddress || null,
            userAgent: meta.userAgent || null,
        });
        const saved = await this.repo.save(entity);
        return { id: saved.id, status: saved.status };
    }
    async findFiltered(opts) {
        const page = Math.max(1, Math.floor(opts.page ?? 1));
        const limit = Math.max(1, Math.min(200, Math.floor(opts.limit ?? 50)));
        const qb = this.repo
            .createQueryBuilder('lead')
            .orderBy('lead.createdAt', 'DESC')
            .take(limit)
            .skip((page - 1) * limit);
        if (opts.status)
            qb.andWhere('lead.status = :status', { status: opts.status });
        if (opts.source)
            qb.andWhere('lead.source = :source', { source: opts.source });
        if (opts.from) {
            const d = new Date(opts.from);
            if (!isNaN(d.getTime()))
                qb.andWhere('lead.createdAt >= :from', { from: d });
        }
        if (opts.to) {
            const d = new Date(opts.to);
            if (!isNaN(d.getTime()))
                qb.andWhere('lead.createdAt <= :to', { to: d });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
    }
    async update(id, dto) {
        const lead = await this.repo.findOne({ where: { id } });
        if (!lead)
            throw new common_1.NotFoundException('Lead bulunamadı');
        if (dto.status) {
            lead.status = dto.status;
            if (dto.status === 'contacted' && !lead.contactedAt) {
                lead.contactedAt = new Date();
            }
        }
        if (dto.notes !== undefined)
            lead.notes = dto.notes || null;
        return this.repo.save(lead);
    }
    _between = typeorm_2.Between;
    _bad = common_1.BadRequestException;
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = LeadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_request_entity_1.LeadRequest)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LeadsService);
//# sourceMappingURL=leads.service.js.map