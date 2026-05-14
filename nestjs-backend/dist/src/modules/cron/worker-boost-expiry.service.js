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
var WorkerBoostExpiryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerBoostExpiryService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const boost_service_1 = require("../boost/boost.service");
let WorkerBoostExpiryService = WorkerBoostExpiryService_1 = class WorkerBoostExpiryService {
    boostSvc;
    logger = new common_1.Logger(WorkerBoostExpiryService_1.name);
    constructor(boostSvc) {
        this.boostSvc = boostSvc;
    }
    async run() {
        const n = await this.boostSvc.expireExpired();
        if (n > 0)
            this.logger.log(`[WorkerBoostExpiry] expired ${n} boosts`);
    }
};
exports.WorkerBoostExpiryService = WorkerBoostExpiryService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WorkerBoostExpiryService.prototype, "run", null);
exports.WorkerBoostExpiryService = WorkerBoostExpiryService = WorkerBoostExpiryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [boost_service_1.BoostService])
], WorkerBoostExpiryService);
//# sourceMappingURL=worker-boost-expiry.service.js.map