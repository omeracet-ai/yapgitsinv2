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
exports.AdminSeedController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const admin_seed_service_1 = require("./admin-seed.service");
let AdminSeedController = class AdminSeedController {
    seed;
    constructor(seed) {
        this.seed = seed;
    }
    assertEnabled() {
        if (process.env.ALLOW_SEED !== '1') {
            throw new common_1.ForbiddenException('Seeding disabled (set ALLOW_SEED=1 and restart)');
        }
    }
    clampCount(count) {
        if (!Number.isFinite(count) || count < 1)
            return 1;
        return Math.min(count, 200);
    }
    warning() {
        return 'ALLOW_SEED is active — disable in production after one-shot use';
    }
    async wipe() {
        this.assertEnabled();
        const t0 = Date.now();
        const wiped = await this.seed.wipeAll();
        return { wiped, durationMs: Date.now() - t0, warning: this.warning() };
    }
    async populate(count) {
        this.assertEnabled();
        const t0 = Date.now();
        const created = await this.seed.populate(this.clampCount(count));
        return { created, durationMs: Date.now() - t0, warning: this.warning() };
    }
    async wipeAndPopulate(count) {
        this.assertEnabled();
        const t0 = Date.now();
        const result = await this.seed.wipeAndPopulate(this.clampCount(count));
        return { ...result, durationMs: Date.now() - t0, warning: this.warning() };
    }
};
exports.AdminSeedController = AdminSeedController;
__decorate([
    (0, common_1.Post)('wipe'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSeedController.prototype, "wipe", null);
__decorate([
    (0, common_1.Post)('populate'),
    __param(0, (0, common_1.Query)('count', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminSeedController.prototype, "populate", null);
__decorate([
    (0, common_1.Post)('wipe-and-populate'),
    __param(0, (0, common_1.Query)('count', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminSeedController.prototype, "wipeAndPopulate", null);
exports.AdminSeedController = AdminSeedController = __decorate([
    (0, common_1.Controller)('admin/seed'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    __metadata("design:paramtypes", [admin_seed_service_1.AdminSeedService])
], AdminSeedController);
//# sourceMappingURL=admin-seed.controller.js.map