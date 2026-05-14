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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditLog = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let AdminAuditLog = class AdminAuditLog {
    id;
    tenantId;
    adminUserId;
    actorEmail;
    actor;
    action;
    targetType;
    targetId;
    payload;
    ip;
    userAgent;
    createdAt;
};
exports.AdminAuditLog = AdminAuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminAuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "adminUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "actorEmail", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'adminUserId' }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], AdminAuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "ip", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 512, nullable: true }),
    __metadata("design:type", Object)
], AdminAuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AdminAuditLog.prototype, "createdAt", void 0);
exports.AdminAuditLog = AdminAuditLog = __decorate([
    (0, typeorm_1.Entity)('admin_audit_logs'),
    (0, typeorm_1.Index)('idx_audit_actor_created', ['adminUserId', 'createdAt']),
    (0, typeorm_1.Index)('idx_audit_action_created', ['action', 'createdAt'])
], AdminAuditLog);
//# sourceMappingURL=admin-audit-log.entity.js.map