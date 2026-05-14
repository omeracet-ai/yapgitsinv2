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
exports.TenantsService = exports.DEFAULT_TENANT_SLUG = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_entity_1 = require("./tenant.entity");
exports.DEFAULT_TENANT_SLUG = 'tr';
let TenantsService = class TenantsService {
    tenantRepo;
    constructor(tenantRepo) {
        this.tenantRepo = tenantRepo;
    }
    async onModuleInit() {
        const existing = await this.tenantRepo.findOne({ where: { slug: exports.DEFAULT_TENANT_SLUG } });
        if (!existing) {
            await this.tenantRepo.save(this.tenantRepo.create({
                slug: exports.DEFAULT_TENANT_SLUG,
                brandName: 'Yapgitsin',
                subdomain: 'yapgitsin.tr',
                theme: { primary: '#007DFE', accent: '#FFA000' },
                defaultCurrency: 'TRY',
                defaultLocale: 'tr-TR',
                isActive: true,
            }));
        }
    }
    async findBySlug(slug) {
        return this.tenantRepo.findOne({ where: { slug, isActive: true } });
    }
    async findBySubdomain(subdomain) {
        return this.tenantRepo.findOne({ where: { subdomain, isActive: true } });
    }
    async findById(id) {
        const t = await this.tenantRepo.findOne({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Tenant not found');
        return t;
    }
    async list() {
        return this.tenantRepo.find({ order: { createdAt: 'ASC' } });
    }
    async create(data) {
        return this.tenantRepo.save(this.tenantRepo.create(data));
    }
    async update(id, data) {
        await this.tenantRepo.update({ id }, data);
        return this.findById(id);
    }
    async getDefault() {
        return this.findBySlug(exports.DEFAULT_TENANT_SLUG);
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map