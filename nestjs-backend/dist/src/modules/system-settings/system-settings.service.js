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
exports.SystemSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const system_setting_entity_1 = require("./system-setting.entity");
let SystemSettingsService = class SystemSettingsService {
    repo;
    cache = new Map();
    constructor(repo) {
        this.repo = repo;
    }
    async get(key, defaultValue) {
        const cached = this.cache.get(key);
        if (cached !== undefined)
            return cached;
        const row = await this.repo.findOne({ where: { key } });
        const value = row?.value ?? defaultValue;
        this.cache.set(key, value);
        return value;
    }
    async set(key, value, adminId) {
        const existing = await this.repo.findOne({ where: { key } });
        const entity = existing
            ? Object.assign(existing, { value, updatedBy: adminId ?? null })
            : this.repo.create({ key, value, updatedBy: adminId ?? null });
        const saved = await this.repo.save(entity);
        this.cache.set(key, value);
        return saved;
    }
    async getAll() {
        return this.repo.find({ order: { key: 'ASC' } });
    }
    invalidate(key) {
        if (key)
            this.cache.delete(key);
        else
            this.cache.clear();
    }
};
exports.SystemSettingsService = SystemSettingsService;
exports.SystemSettingsService = SystemSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SystemSettingsService);
//# sourceMappingURL=system-settings.service.js.map