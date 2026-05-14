"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_audit_log_entity_1 = require("./admin-audit-log.entity");
const admin_audit_service_1 = require("./admin-audit.service");
const audit_interceptor_1 = require("./audit.interceptor");
const user_entity_1 = require("../users/user.entity");
let AdminAuditModule = class AdminAuditModule {
};
exports.AdminAuditModule = AdminAuditModule;
exports.AdminAuditModule = AdminAuditModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([admin_audit_log_entity_1.AdminAuditLog, user_entity_1.User])],
        providers: [admin_audit_service_1.AdminAuditService, audit_interceptor_1.AuditInterceptor],
        exports: [admin_audit_service_1.AdminAuditService, audit_interceptor_1.AuditInterceptor],
    })
], AdminAuditModule);
//# sourceMappingURL=admin-audit.module.js.map