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
exports.WorkerInsuranceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const worker_insurance_entity_1 = require("./worker-insurance.entity");
let WorkerInsuranceService = class WorkerInsuranceService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async getByUserId(userId) {
        return this.repo.findOne({ where: { userId } });
    }
    async upsert(userId, dto) {
        const policyNumber = (dto.policyNumber || '').trim();
        const provider = (dto.provider || '').trim();
        const coverage = Number(dto.coverageAmount);
        const expires = new Date(dto.expiresAt);
        if (!policyNumber || policyNumber.length > 50) {
            throw new common_1.BadRequestException('policyNumber gerekli (max 50)');
        }
        if (!provider || provider.length > 100) {
            throw new common_1.BadRequestException('provider gerekli (max 100)');
        }
        if (!isFinite(coverage) || coverage <= 0) {
            throw new common_1.BadRequestException('coverageAmount > 0 olmalı');
        }
        if (isNaN(expires.getTime())) {
            throw new common_1.BadRequestException('expiresAt geçersiz');
        }
        const existing = await this.repo.findOne({ where: { userId } });
        if (existing) {
            existing.policyNumber = policyNumber;
            existing.provider = provider;
            existing.coverageAmount = coverage;
            existing.expiresAt = expires;
            existing.documentUrl = dto.documentUrl ?? existing.documentUrl ?? null;
            existing.verified = false;
            existing.verifiedBy = null;
            existing.verifiedAt = null;
            return this.repo.save(existing);
        }
        const created = this.repo.create({
            userId,
            policyNumber,
            provider,
            coverageAmount: coverage,
            expiresAt: expires,
            documentUrl: dto.documentUrl ?? null,
            verified: false,
        });
        return this.repo.save(created);
    }
    async remove(userId) {
        await this.repo.delete({ userId });
        return { ok: true };
    }
    async setVerified(userId, verified, adminId) {
        const ins = await this.repo.findOne({ where: { userId } });
        if (!ins)
            throw new common_1.NotFoundException('Sigorta kaydı bulunamadı');
        ins.verified = verified;
        ins.verifiedBy = verified ? adminId : null;
        ins.verifiedAt = verified ? new Date() : null;
        return this.repo.save(ins);
    }
    isInsured(ins) {
        if (!ins)
            return false;
        if (!ins.verified)
            return false;
        const exp = ins.expiresAt instanceof Date ? ins.expiresAt : new Date(ins.expiresAt);
        return exp.getTime() > Date.now();
    }
    toPublic(ins) {
        return {
            provider: ins.provider,
            coverageAmount: ins.coverageAmount,
            expiresAt: ins.expiresAt,
            verified: ins.verified,
        };
    }
};
exports.WorkerInsuranceService = WorkerInsuranceService;
exports.WorkerInsuranceService = WorkerInsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(worker_insurance_entity_1.WorkerInsurance)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WorkerInsuranceService);
//# sourceMappingURL=worker-insurance.service.js.map