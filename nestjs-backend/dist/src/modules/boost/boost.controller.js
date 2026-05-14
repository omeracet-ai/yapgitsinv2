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
exports.BoostController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const boost_service_1 = require("./boost.service");
const boost_entity_1 = require("./boost.entity");
let BoostController = class BoostController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    packages() {
        return this.svc.getPackages();
    }
    async my(req) {
        return this.svc.getMy(req.user.id);
    }
    async purchase(req, body) {
        const t = body?.type;
        if (t !== boost_entity_1.BoostType.FEATURED_24H &&
            t !== boost_entity_1.BoostType.FEATURED_7D &&
            t !== boost_entity_1.BoostType.TOP_SEARCH_24H) {
            throw new common_1.BadRequestException('Geçersiz boost tipi');
        }
        return this.svc.purchase(req.user.id, t);
    }
};
exports.BoostController = BoostController;
__decorate([
    (0, common_1.Get)('packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BoostController.prototype, "packages", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BoostController.prototype, "my", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('purchase'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BoostController.prototype, "purchase", null);
exports.BoostController = BoostController = __decorate([
    (0, swagger_1.ApiTags)('boost'),
    (0, common_1.Controller)('boost'),
    __metadata("design:paramtypes", [boost_service_1.BoostService])
], BoostController);
//# sourceMappingURL=boost.controller.js.map