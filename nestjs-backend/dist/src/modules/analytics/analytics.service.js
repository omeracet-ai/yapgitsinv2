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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const user_entity_1 = require("../users/user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const job_lead_entity_1 = require("../leads/job-lead.entity");
const job_lead_response_entity_1 = require("../leads/job-lead-response.entity");
let AnalyticsService = class AnalyticsService {
    usersRepository;
    bookingsRepository;
    jobLeadsRepository;
    jobLeadResponsesRepository;
    cacheManager;
    CACHE_TTL = 5 * 60 * 1000;
    constructor(usersRepository, bookingsRepository, jobLeadsRepository, jobLeadResponsesRepository, cacheManager) {
        this.usersRepository = usersRepository;
        this.bookingsRepository = bookingsRepository;
        this.jobLeadsRepository = jobLeadsRepository;
        this.jobLeadResponsesRepository = jobLeadResponsesRepository;
        this.cacheManager = cacheManager;
    }
    async getOverview() {
        const cacheKey = 'analytics:overview';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const [totalLeads, activeLeads, totalWorkers, totalCustomers, totalBookings, completedBookings,] = await Promise.all([
            this.jobLeadsRepository.count(),
            this.jobLeadsRepository.count({ where: { status: 'open' } }),
            this.usersRepository
                .createQueryBuilder('u')
                .where('u.role = :role', { role: 'user' })
                .andWhere('(u.asWorkerTotal > 0 OR u.asWorkerSuccess > 0)')
                .getCount(),
            this.usersRepository
                .createQueryBuilder('u')
                .where('u.role = :role', { role: 'user' })
                .andWhere('(u.asCustomerTotal > 0 OR u.asCustomerSuccess > 0)')
                .getCount(),
            this.bookingsRepository.count(),
            this.bookingsRepository.count({
                where: { status: booking_entity_1.BookingStatus.COMPLETED },
            }),
        ]);
        const bookings = await this.bookingsRepository.find({
            where: { status: booking_entity_1.BookingStatus.COMPLETED },
        });
        const totalRevenue = bookings.reduce((sum, b) => {
            const amount = (b.agreedPriceMinor ?? 0) / 100;
            return sum + amount;
        }, 0);
        const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
        const leadsWithResponses = await this.jobLeadsRepository
            .createQueryBuilder('l')
            .leftJoinAndSelect('l.responses', 'r')
            .getMany();
        const leadsWithResponsesCount = leadsWithResponses.filter((l) => (l.responses?.length ?? 0) > 0).length;
        const leadConversionRate = totalLeads > 0 ? (leadsWithResponsesCount / totalLeads) * 100 : 0;
        const result = {
            totalLeads,
            activeLeads,
            totalWorkers,
            totalCustomers,
            totalBookings,
            completedBookings,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            averageBookingValue: Math.round(averageBookingValue * 100) / 100,
            leadConversionRate: Math.round(leadConversionRate * 100) / 100,
        };
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }
    async getWorkerAnalytics(workerId) {
        const cacheKey = workerId
            ? `analytics:workers:${workerId}`
            : 'analytics:workers:all';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        let query = this.usersRepository
            .createQueryBuilder('u')
            .where('u.role = :role', { role: 'user' })
            .andWhere('u.asWorkerTotal > 0');
        if (workerId) {
            query = query.andWhere('u.id = :workerId', { workerId });
        }
        const workers = await query.getMany();
        const analytics = await Promise.all(workers.map(async (worker) => {
            const bookings = await this.bookingsRepository.find({
                where: { workerId: worker.id },
            });
            const completedBookings = bookings.filter((b) => b.status === booking_entity_1.BookingStatus.COMPLETED);
            const totalEarnings = completedBookings.reduce((sum, b) => {
                const amount = (b.agreedPriceMinor ?? 0) / 100;
                return sum + amount;
            }, 0);
            const confirmedBookings = bookings.filter((b) => b.status !== booking_entity_1.BookingStatus.PENDING);
            let avgResponseTime = 0;
            if (confirmedBookings.length > 0) {
                const totalTime = confirmedBookings.reduce((sum, b) => {
                    const createdAt = new Date(b.createdAt).getTime();
                    const updatedAt = new Date(b.updatedAt).getTime();
                    return sum + (updatedAt - createdAt) / (1000 * 60);
                }, 0);
                avgResponseTime = totalTime / confirmedBookings.length;
            }
            return {
                workerId: worker.id,
                workerName: worker.fullName,
                totalBookings: bookings.length,
                completedBookings: completedBookings.length,
                successRate: bookings.length > 0
                    ? (completedBookings.length / bookings.length) * 100
                    : 0,
                averageResponseTime: Math.round(avgResponseTime * 100) / 100,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                averageRating: worker.averageRating || 0,
            };
        }));
        analytics.sort((a, b) => b.totalBookings - a.totalBookings);
        await this.cacheManager.set(cacheKey, analytics, this.CACHE_TTL);
        return analytics;
    }
    async getLeadAnalytics() {
        const cacheKey = 'analytics:leads';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const [totalLeads, openLeads, inProgressLeads, closedLeads, expiredLeads] = await Promise.all([
            this.jobLeadsRepository.count(),
            this.jobLeadsRepository.count({ where: { status: 'open' } }),
            this.jobLeadsRepository.count({
                where: { status: 'in_progress' },
            }),
            this.jobLeadsRepository.count({ where: { status: 'closed' } }),
            this.jobLeadsRepository.count({ where: { status: 'expired' } }),
        ]);
        const allLeads = await this.jobLeadsRepository
            .createQueryBuilder('lead')
            .leftJoinAndSelect('lead.responses', 'responses')
            .getMany();
        const leadsWithResponses = allLeads.filter((l) => (l.responses?.length ?? 0) > 0).length;
        const totalResponses = allLeads.reduce((sum, l) => sum + (l.responses?.length ?? 0), 0);
        const categoryStats = allLeads.reduce((acc, lead) => {
            const cat = lead.category || 'Unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        const topCategories = Object.entries(categoryStats)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const result = {
            totalLeads,
            openLeads,
            inProgressLeads,
            closedLeads,
            expiredLeads,
            conversionRate: totalLeads > 0 ? (leadsWithResponses / totalLeads) * 100 : 0,
            averageResponseCount: totalLeads > 0 ? totalResponses / totalLeads : 0,
            topCategories,
        };
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }
    async getRevenueAnalytics() {
        const cacheKey = 'analytics:revenue';
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const completedBookings = await this.bookingsRepository.find({
            where: { status: booking_entity_1.BookingStatus.COMPLETED },
            order: { createdAt: 'DESC' },
        });
        const totalRevenue = completedBookings.reduce((sum, b) => {
            const amount = (b.agreedPriceMinor ?? 0) / 100;
            return sum + amount;
        }, 0);
        const revenueByPeriodMap = new Map();
        completedBookings.forEach((booking) => {
            const date = new Date(booking.createdAt);
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = (booking.agreedPriceMinor ?? 0) / 100;
            const current = revenueByPeriodMap.get(period) || {
                revenue: 0,
                bookingCount: 0,
            };
            current.revenue += amount;
            current.bookingCount += 1;
            revenueByPeriodMap.set(period, current);
        });
        const revenueByPeriod = Array.from(revenueByPeriodMap.entries())
            .map(([period, data]) => ({
            period,
            revenue: Math.round(data.revenue * 100) / 100,
            bookingCount: data.bookingCount,
        }))
            .sort((a, b) => a.period.localeCompare(b.period));
        const revenueByCategory = {};
        completedBookings.forEach((booking) => {
            const cat = booking.category || 'Unknown';
            const amount = (booking.agreedPriceMinor ?? 0) / 100;
            revenueByCategory[cat] = (revenueByCategory[cat] || 0) + amount;
        });
        const revenueByCategoryArray = Object.entries(revenueByCategory)
            .map(([category, revenue]) => ({
            category,
            revenue: Math.round(revenue * 100) / 100,
        }))
            .sort((a, b) => b.revenue - a.revenue);
        const result = {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            revenueByPeriod,
            revenueByCategory: revenueByCategoryArray,
            averageTransactionValue: completedBookings.length > 0
                ? Math.round((totalRevenue / completedBookings.length) * 100) / 100
                : 0,
        };
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }
    async clearCache() {
        const keys = [
            'analytics:overview',
            'analytics:workers:all',
            'analytics:leads',
            'analytics:revenue',
        ];
        for (const key of keys) {
            await this.cacheManager.del(key);
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_2.InjectRepository)(booking_entity_1.Booking)),
    __param(2, (0, typeorm_2.InjectRepository)(job_lead_entity_1.JobLead)),
    __param(3, (0, typeorm_2.InjectRepository)(job_lead_response_entity_1.JobLeadResponse)),
    __param(4, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository, Object])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map