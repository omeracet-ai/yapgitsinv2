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
exports.StatementsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
let StatementsService = class StatementsService {
    escrowRepo;
    constructor(escrowRepo) {
        this.escrowRepo = escrowRepo;
    }
    async getMonthly(userId, year, month) {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 1, 0, 0, 0, 0);
        const [customerSide, taskerSide] = await Promise.all([
            this.escrowRepo.find({
                where: {
                    customerId: userId,
                    status: payment_escrow_entity_1.EscrowStatus.RELEASED,
                    releasedAt: (0, typeorm_2.Between)(start, end),
                },
            }),
            this.escrowRepo.find({
                where: {
                    taskerId: userId,
                    status: payment_escrow_entity_1.EscrowStatus.RELEASED,
                    releasedAt: (0, typeorm_2.Between)(start, end),
                },
            }),
        ]);
        const totalSpent = customerSide.reduce((s, e) => s + (e.amount ?? 0), 0);
        const totalGross = taskerSide.reduce((s, e) => s + (e.amount ?? 0), 0);
        const totalCommission = taskerSide.reduce((s, e) => s + (e.platformFeeAmount ?? 0), 0);
        const totalNet = taskerSide.reduce((s, e) => s + (e.taskerNetAmount ?? 0), 0);
        const lineItems = [
            ...customerSide.map((e) => ({
                date: e.releasedAt,
                jobId: e.jobId,
                role: 'customer',
                amount: e.amount ?? 0,
                commission: e.platformFeeAmount ?? 0,
                net: e.taskerNetAmount ?? 0,
                status: e.status,
            })),
            ...taskerSide.map((e) => ({
                date: e.releasedAt,
                jobId: e.jobId,
                role: 'tasker',
                amount: e.amount ?? 0,
                commission: e.platformFeeAmount ?? 0,
                net: e.taskerNetAmount ?? 0,
                status: e.status,
            })),
        ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
        return {
            period: { year, month },
            asCustomer: { count: customerSide.length, totalSpent },
            asTasker: {
                count: taskerSide.length,
                totalGross,
                totalCommission,
                totalNet,
            },
            lineItems,
        };
    }
    async getMonthlyCsv(userId, year, month) {
        const data = await this.getMonthly(userId, year, month);
        const BOM = '﻿';
        const header = 'Tarih,Rol,İş ID,Tutar (₺),Komisyon (₺),Net (₺),Durum';
        const rows = data.lineItems.map((li) => {
            const date = li.date ? new Date(li.date).toISOString().slice(0, 10) : '';
            const roleTr = li.role === 'customer' ? 'Müşteri' : 'Usta';
            return [
                date,
                roleTr,
                li.jobId,
                li.amount.toFixed(2),
                li.commission.toFixed(2),
                li.net.toFixed(2),
                li.status,
            ].join(',');
        });
        return BOM + [header, ...rows].join('\n');
    }
};
exports.StatementsService = StatementsService;
exports.StatementsService = StatementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_escrow_entity_1.PaymentEscrow)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StatementsService);
//# sourceMappingURL=statements.service.js.map