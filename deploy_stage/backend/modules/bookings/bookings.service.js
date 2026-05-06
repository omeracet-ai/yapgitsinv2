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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("./booking.entity");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
let BookingsService = class BookingsService {
    repo;
    usersService;
    notificationsService;
    constructor(repo, usersService, notificationsService) {
        this.repo = repo;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
    }
    async create(customerId, data) {
        const worker = await this.usersService.findById(data.workerId);
        if (!worker)
            throw new common_1.NotFoundException('Usta bulunamadı');
        const booking = this.repo.create({
            customerId,
            workerId: data.workerId,
            category: data.category,
            subCategory: data.subCategory ?? null,
            description: data.description,
            address: data.address,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime ?? null,
            customerNote: data.customerNote ?? null,
            status: booking_entity_1.BookingStatus.PENDING,
        });
        const saved = await this.repo.save(booking);
        const customer = await this.usersService.findById(customerId);
        await this.notificationsService.send({
            userId: data.workerId,
            type: notification_entity_1.NotificationType.BOOKING_REQUEST,
            title: '📅 Yeni Randevu İsteği',
            body: `${customer?.fullName ?? 'Bir müşteri'} sizi ${data.category} için ${data.scheduledDate} tarihine randevu istedi.`,
            refId: saved.id,
        });
        return saved;
    }
    async updateStatus(id, actorId, status, note) {
        const booking = await this.repo.findOne({
            where: { id },
            relations: ['customer', 'worker'],
        });
        if (!booking)
            throw new common_1.NotFoundException('Randevu bulunamadı');
        const isWorker = booking.workerId === actorId;
        const isCustomer = booking.customerId === actorId;
        if (!isWorker && !isCustomer)
            throw new common_1.ForbiddenException('Yetkisiz işlem');
        const old = booking.status;
        booking.status = status;
        if (note) {
            if (isWorker)
                booking.workerNote = note;
            if (isCustomer)
                booking.customerNote = note;
        }
        const saved = await this.repo.save(booking);
        await this._notifyStatusChange(saved, old, isWorker);
        if (status === booking_entity_1.BookingStatus.COMPLETED) {
            await this.usersService.bumpStat(booking.customerId, 'asCustomerSuccess');
            await this.usersService.bumpStat(booking.workerId, 'asWorkerSuccess');
            await this.usersService.recalcReputation(booking.customerId);
            await this.usersService.recalcReputation(booking.workerId);
        }
        if (status === booking_entity_1.BookingStatus.CANCELLED) {
            if (old !== booking_entity_1.BookingStatus.PENDING) {
                await this.usersService.bumpStat(booking.customerId, 'asCustomerFail');
                await this.usersService.bumpStat(booking.workerId, 'asWorkerFail');
                await this.usersService.recalcReputation(booking.customerId);
                await this.usersService.recalcReputation(booking.workerId);
            }
        }
        return saved;
    }
    async findByCustomer(customerId, page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            where: { customerId },
            relations: ['worker'],
            order: { scheduledDate: 'DESC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findByWorker(workerId, page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            where: { workerId },
            relations: ['customer'],
            order: { scheduledDate: 'ASC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findOne(id, actorId) {
        const b = await this.repo.findOne({
            where: { id },
            relations: ['customer', 'worker'],
        });
        if (!b)
            throw new common_1.NotFoundException('Randevu bulunamadı');
        if (b.customerId !== actorId && b.workerId !== actorId)
            throw new common_1.ForbiddenException('Yetkisiz işlem');
        return b;
    }
    async _notifyStatusChange(b, _old, isWorker) {
        if (b.status === booking_entity_1.BookingStatus.CONFIRMED) {
            await this.notificationsService.send({
                userId: b.customerId,
                type: notification_entity_1.NotificationType.BOOKING_CONFIRMED,
                title: '✅ Randevunuz Onaylandı',
                body: `${b.worker?.fullName ?? 'Usta'} randevunuzu onayladı. Tarih: ${b.scheduledDate}`,
                refId: b.id,
            });
        }
        if (b.status === booking_entity_1.BookingStatus.CANCELLED) {
            const notifyId = isWorker ? b.customerId : b.workerId;
            const actor = isWorker ? b.worker?.fullName : b.customer?.fullName;
            await this.notificationsService.send({
                userId: notifyId,
                type: notification_entity_1.NotificationType.BOOKING_CANCELLED,
                title: '❌ Randevu İptal Edildi',
                body: `${actor ?? 'Taraf'} randevuyu iptal etti.`,
                refId: b.id,
            });
        }
        if (b.status === booking_entity_1.BookingStatus.COMPLETED) {
            await this.notificationsService.send({
                userId: b.customerId,
                type: notification_entity_1.NotificationType.BOOKING_COMPLETED,
                title: '🎉 İş Tamamlandı',
                body: `${b.worker?.fullName ?? 'Usta'} işi tamamlandı olarak işaretledi. Değerlendirme yapmayı unutmayın!`,
                refId: b.id,
            });
        }
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map