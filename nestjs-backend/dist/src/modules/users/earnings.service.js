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
exports.EarningsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const booking_entity_1 = require("../bookings/booking.entity");
function resolveFeePct() {
    const rate = process.env.PLATFORM_FEE_RATE;
    if (rate !== undefined && rate !== '') {
        const p = parseFloat(rate);
        if (!Number.isNaN(p) && p >= 0 && p <= 1)
            return Math.round(p * 10000) / 100;
    }
    const pct = parseFloat(process.env.PLATFORM_FEE_PCT ?? '10');
    return Number.isNaN(pct) || pct < 0 || pct > 100 ? 10 : pct;
}
let EarningsService = class EarningsService {
    jobsRepo;
    offersRepo;
    bookingsRepo;
    constructor(jobsRepo, offersRepo, bookingsRepo) {
        this.jobsRepo = jobsRepo;
        this.offersRepo = offersRepo;
        this.bookingsRepo = bookingsRepo;
    }
    ym(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }
    async getEarnings(userId, monthsRaw) {
        const months = Math.min(24, Math.max(1, Math.floor(monthsRaw) || 6));
        const offerRows = await this.offersRepo
            .createQueryBuilder('offer')
            .innerJoinAndSelect('offer.job', 'job')
            .where('offer.userId = :uid', { uid: userId })
            .andWhere('offer.status = :os', { os: offer_entity_1.OfferStatus.ACCEPTED })
            .andWhere('job.status = :js', { js: job_entity_1.JobStatus.COMPLETED })
            .getMany();
        const bookingRows = await this.bookingsRepo.find({
            where: { workerId: userId, status: booking_entity_1.BookingStatus.COMPLETED },
        });
        const items = [];
        for (const o of offerRows) {
            const price = Number(o.price) || 0;
            if (price <= 0)
                continue;
            items.push({
                date: o.job?.updatedAt || o.updatedAt,
                amount: price,
                category: o.job?.category || 'Diğer',
            });
        }
        for (const b of bookingRows) {
            const price = Number(b.agreedPrice) || 0;
            if (price <= 0)
                continue;
            items.push({
                date: b.updatedAt,
                amount: price,
                category: b.category || 'Diğer',
            });
        }
        const now = new Date();
        const thisMonthKey = this.ym(now);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = this.ym(lastMonthDate);
        let total = 0;
        let thisMonth = 0;
        let lastMonth = 0;
        let thisMonthCount = 0;
        const monthMap = new Map();
        const catMap = new Map();
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = this.ym(d);
            monthMap.set(key, { month: key, earnings: 0, count: 0 });
        }
        for (const it of items) {
            total += it.amount;
            const key = this.ym(it.date);
            if (key === thisMonthKey) {
                thisMonth += it.amount;
                thisMonthCount++;
            }
            if (key === lastMonthKey)
                lastMonth += it.amount;
            if (monthMap.has(key)) {
                const mp = monthMap.get(key);
                mp.earnings += it.amount;
                mp.count += 1;
            }
            const cat = it.category;
            const cAgg = catMap.get(cat) || { category: cat, earnings: 0, count: 0 };
            cAgg.earnings += it.amount;
            cAgg.count += 1;
            catMap.set(cat, cAgg);
        }
        const completedJobsCount = items.length;
        const growthPercent = lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10
            : thisMonth > 0
                ? 100
                : 0;
        const averageJobValue = completedJobsCount > 0
            ? Math.round((total / completedJobsCount) * 100) / 100
            : 0;
        const monthlySeries = Array.from(monthMap.values()).map((m) => ({
            month: m.month,
            earnings: Math.round(m.earnings * 100) / 100,
            count: m.count,
        }));
        const topCategories = Array.from(catMap.values())
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, 5)
            .map((c) => ({
            category: c.category,
            earnings: Math.round(c.earnings * 100) / 100,
            count: c.count,
        }));
        const feePct = resolveFeePct();
        const totalEarnings = Math.round(total * 100) / 100;
        const thisMonthEarnings = Math.round(thisMonth * 100) / 100;
        const platformFeesPaid = Math.round(totalEarnings * feePct) / 100;
        const netEarnings = Math.round((totalEarnings - platformFeesPaid) * 100) / 100;
        const thisMonthNetEarnings = Math.round(thisMonthEarnings * (100 - feePct)) / 100;
        return {
            totalEarnings,
            thisMonthEarnings,
            lastMonthEarnings: Math.round(lastMonth * 100) / 100,
            growthPercent,
            completedJobsCount,
            thisMonthCount,
            monthlySeries,
            topCategories,
            averageJobValue,
            platformFeePct: feePct,
            platformFeesPaid,
            netEarnings,
            thisMonthNetEarnings,
        };
    }
};
exports.EarningsService = EarningsService;
exports.EarningsService = EarningsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(2, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], EarningsService);
//# sourceMappingURL=earnings.service.js.map