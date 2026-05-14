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
exports.DataExportController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const data_export_service_1 = require("./data-export.service");
let DataExportController = class DataExportController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async export(req, res) {
        const userId = req.user.id;
        const data = await this.svc.exportForUser(userId);
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        res.setHeader('Content-Disposition', `attachment; filename="yapgitsin-data-export-${userId}-${date}.json"`);
        res.send(JSON.stringify(data, null, 2));
    }
};
exports.DataExportController = DataExportController;
__decorate([
    (0, common_1.Get)('data-export.json'),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60_000 } }),
    (0, common_1.Header)('Content-Type', 'application/json; charset=utf-8'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DataExportController.prototype, "export", null);
exports.DataExportController = DataExportController = __decorate([
    (0, common_1.Controller)('users/me'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [data_export_service_1.DataExportService])
], DataExportController);
//# sourceMappingURL=data-export.controller.js.map