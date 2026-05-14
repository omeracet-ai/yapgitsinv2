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
exports.WorkerCertificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const worker_certification_entity_1 = require("./worker-certification.entity");
let WorkerCertificationService = class WorkerCertificationService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async listOwn(userId) {
        return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    }
    async listPublic(userId) {
        return this.repo.find({
            where: { userId, verified: true },
            order: { createdAt: 'DESC' },
        });
    }
    async create(userId, dto) {
        const name = (dto.name || '').trim();
        const issuer = (dto.issuer || '').trim();
        if (!name || name.length > 200)
            throw new common_1.BadRequestException('name gerekli (max 200)');
        if (!issuer || issuer.length > 200)
            throw new common_1.BadRequestException('issuer gerekli (max 200)');
        const issued = new Date(dto.issuedAt);
        if (isNaN(issued.getTime()))
            throw new common_1.BadRequestException('issuedAt geçersiz');
        let expires = null;
        if (dto.expiresAt) {
            expires = new Date(dto.expiresAt);
            if (isNaN(expires.getTime()))
                throw new common_1.BadRequestException('expiresAt geçersiz');
        }
        const created = this.repo.create({
            userId,
            name,
            issuer,
            issuedAt: issued,
            expiresAt: expires,
            documentUrl: dto.documentUrl ?? null,
            verified: false,
        });
        return this.repo.save(created);
    }
    async deleteOwn(userId, certId) {
        const cert = await this.repo.findOne({ where: { id: certId } });
        if (!cert)
            throw new common_1.NotFoundException('Sertifika bulunamadı');
        if (cert.userId !== userId)
            throw new common_1.ForbiddenException('Bu sertifika size ait değil');
        await this.repo.delete({ id: certId });
        return { ok: true };
    }
    async listPending() {
        return this.repo.find({ where: { verified: false }, order: { createdAt: 'ASC' } });
    }
    async setVerified(certId, verified, adminId, adminNote) {
        const cert = await this.repo.findOne({ where: { id: certId } });
        if (!cert)
            throw new common_1.NotFoundException('Sertifika bulunamadı');
        cert.verified = verified;
        cert.verifiedBy = verified ? adminId : null;
        cert.verifiedAt = verified ? new Date() : null;
        if (adminNote !== undefined)
            cert.adminNote = adminNote || null;
        return this.repo.save(cert);
    }
    async hasVerifiedCertification(userId) {
        const certs = await this.repo.find({ where: { userId, verified: true } });
        if (certs.length === 0)
            return false;
        const now = Date.now();
        return certs.some((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now);
    }
    toPublic(c) {
        return {
            name: c.name,
            issuer: c.issuer,
            issuedAt: c.issuedAt,
            expiresAt: c.expiresAt,
            verified: c.verified,
        };
    }
};
exports.WorkerCertificationService = WorkerCertificationService;
exports.WorkerCertificationService = WorkerCertificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(worker_certification_entity_1.WorkerCertification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WorkerCertificationService);
//# sourceMappingURL=worker-certification.service.js.map