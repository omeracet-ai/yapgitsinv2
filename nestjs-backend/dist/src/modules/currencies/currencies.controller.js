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
exports.CurrenciesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const currencies_service_1 = require("./currencies.service");
const user_entity_1 = require("../users/user.entity");
let CurrenciesController = class CurrenciesController {
    svc;
    usersRepo;
    constructor(svc, usersRepo) {
        this.svc = svc;
        this.usersRepo = usersRepo;
    }
    list() {
        return this.svc.listActive();
    }
    async setMyCurrency(req, body) {
        const code = (body?.code || '').toUpperCase();
        const cur = await this.svc.findOne(code);
        if (!cur || !cur.isActive)
            throw new common_1.BadRequestException('invalid currency');
        await this.usersRepo.update(req.user.id, { preferredCurrency: code });
        return { preferredCurrency: code };
    }
    async adminUpdateRate(code, body) {
        if (typeof body?.rateToBase !== 'number' || body.rateToBase <= 0) {
            throw new common_1.BadRequestException('rateToBase must be a positive number');
        }
        return this.svc.setRate(code, body.rateToBase);
    }
};
exports.CurrenciesController = CurrenciesController;
__decorate([
    (0, common_1.Get)('currencies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CurrenciesController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('users/me/currency'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CurrenciesController.prototype, "setMyCurrency", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('admin/currencies/:code'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CurrenciesController.prototype, "adminUpdateRate", null);
exports.CurrenciesController = CurrenciesController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [currencies_service_1.CurrenciesService,
        typeorm_2.Repository])
], CurrenciesController);
//# sourceMappingURL=currencies.controller.js.map