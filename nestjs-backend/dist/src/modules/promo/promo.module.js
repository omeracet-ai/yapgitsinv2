"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const promo_code_entity_1 = require("./promo-code.entity");
const promo_redemption_entity_1 = require("./promo-redemption.entity");
const promo_service_1 = require("./promo.service");
const promo_controller_1 = require("./promo.controller");
const user_entity_1 = require("../users/user.entity");
const admin_audit_module_1 = require("../admin-audit/admin-audit.module");
let PromoModule = class PromoModule {
};
exports.PromoModule = PromoModule;
exports.PromoModule = PromoModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([promo_code_entity_1.PromoCode, promo_redemption_entity_1.PromoRedemption, user_entity_1.User]), admin_audit_module_1.AdminAuditModule],
        controllers: [promo_controller_1.PromoController],
        providers: [promo_service_1.PromoService],
        exports: [promo_service_1.PromoService],
    })
], PromoModule);
//# sourceMappingURL=promo.module.js.map