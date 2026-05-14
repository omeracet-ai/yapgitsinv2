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
exports.StatementsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const statements_service_1 = require("./statements.service");
let StatementsController = class StatementsController {
    statementsService;
    constructor(statementsService) {
        this.statementsService = statementsService;
    }
    parsePeriod(yearRaw, monthRaw) {
        const now = new Date();
        const year = yearRaw ? Number(yearRaw) : now.getFullYear();
        const month = monthRaw ? Number(monthRaw) : now.getMonth() + 1;
        if (!Number.isInteger(year) || year < 2020 || year > 2030) {
            throw new common_1.BadRequestException('year must be between 2020 and 2030');
        }
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            throw new common_1.BadRequestException('month must be between 1 and 12');
        }
        return { year, month };
    }
    async getMine(req, yearRaw, monthRaw) {
        const { year, month } = this.parsePeriod(yearRaw, monthRaw);
        const userId = req.user.userId ?? req.user.sub ?? req.user.id;
        return this.statementsService.getMonthly(userId, year, month);
    }
    async downloadMine(req, res, yearRaw, monthRaw) {
        const { year, month } = this.parsePeriod(yearRaw, monthRaw);
        const userId = req.user.userId ?? req.user.sub ?? req.user.id;
        const csv = await this.statementsService.getMonthlyCsv(userId, year, month);
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="beyan-${year}-${String(month).padStart(2, '0')}.csv"`);
        res.send(csv);
    }
};
exports.StatementsController = StatementsController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], StatementsController.prototype, "getMine", null);
__decorate([
    (0, common_1.Get)('me/download'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], StatementsController.prototype, "downloadMine", null);
exports.StatementsController = StatementsController = __decorate([
    (0, common_1.Controller)('statements'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [statements_service_1.StatementsService])
], StatementsController);
//# sourceMappingURL=statements.controller.js.map