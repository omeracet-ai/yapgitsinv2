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
exports.UserReport = void 0;
const typeorm_1 = require("typeorm");
let UserReport = class UserReport {
    id;
    reporterUserId;
    reportedUserId;
    reason;
    description;
    status;
    adminNote;
    createdAt;
    updatedAt;
};
exports.UserReport = UserReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], UserReport.prototype, "reporterUserId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], UserReport.prototype, "reportedUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: [
            'spam',
            'harassment',
            'fraud',
            'inappropriate',
            'fake_profile',
            'inappropriate_content',
            'other',
        ],
    }),
    __metadata("design:type", String)
], UserReport.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserReport.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ['pending', 'reviewed', 'dismissed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], UserReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserReport.prototype, "adminNote", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], UserReport.prototype, "updatedAt", void 0);
exports.UserReport = UserReport = __decorate([
    (0, typeorm_1.Entity)('user_reports')
], UserReport);
//# sourceMappingURL=user-report.entity.js.map