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
exports.BookingEscrowController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const booking_escrow_service_1 = require("./booking-escrow.service");
const booking_entity_1 = require("../bookings/booking.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const common_2 = require("@nestjs/common");
let BookingEscrowController = class BookingEscrowController {
    svc;
    bookingRepo;
    constructor(svc, bookingRepo) {
        this.svc = svc;
        this.bookingRepo = bookingRepo;
    }
    async hold(body, req) {
        if (!body?.bookingId || !body?.amount) {
            throw new common_2.BadRequestException('bookingId ve amount zorunlu');
        }
        const booking = await this.bookingRepo.findOne({
            where: { id: body.bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking bulunamadı');
        if (booking.customerId !== req.user.id) {
            throw new common_2.ForbiddenException('Sadece müşteri hold çağırabilir');
        }
        return this.svc.hold(body.bookingId, booking.customerId, booking.workerId, body.amount);
    }
    release(bookingId, req) {
        return this.svc.release(bookingId, req.user.id);
    }
    async getByBooking(bookingId, req) {
        const escrow = await this.svc.getByBooking(bookingId, req.user.id);
        if (!escrow)
            throw new common_1.NotFoundException('Escrow yok');
        return escrow;
    }
};
exports.BookingEscrowController = BookingEscrowController;
__decorate([
    (0, common_1.Post)('hold'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BookingEscrowController.prototype, "hold", null);
__decorate([
    (0, common_1.Post)('release/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingEscrowController.prototype, "release", null);
__decorate([
    (0, common_1.Get)('booking/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingEscrowController.prototype, "getByBooking", null);
exports.BookingEscrowController = BookingEscrowController = __decorate([
    (0, common_1.Controller)('escrow'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [booking_escrow_service_1.BookingEscrowService,
        typeorm_2.Repository])
], BookingEscrowController);
//# sourceMappingURL=booking-escrow.controller.js.map