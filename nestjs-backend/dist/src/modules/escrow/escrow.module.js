"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const payment_escrow_entity_1 = require("./payment-escrow.entity");
const escrow_service_1 = require("./escrow.service");
const fee_service_1 = require("./fee.service");
const iyzipay_service_1 = require("./iyzipay.service");
const escrow_controller_1 = require("./escrow.controller");
const escrow_admin_controller_1 = require("./escrow-admin.controller");
const booking_escrow_entity_1 = require("./booking-escrow.entity");
const booking_escrow_service_1 = require("./booking-escrow.service");
const booking_escrow_controller_1 = require("./booking-escrow.controller");
const booking_entity_1 = require("../bookings/booking.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const admin_audit_log_entity_1 = require("../admin-audit/admin-audit-log.entity");
let EscrowModule = class EscrowModule {
};
exports.EscrowModule = EscrowModule;
exports.EscrowModule = EscrowModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                payment_escrow_entity_1.PaymentEscrow,
                booking_escrow_entity_1.BookingEscrow,
                booking_entity_1.Booking,
                token_transaction_entity_1.TokenTransaction,
                admin_audit_log_entity_1.AdminAuditLog,
            ]),
        ],
        controllers: [escrow_controller_1.EscrowController, escrow_admin_controller_1.EscrowAdminController, booking_escrow_controller_1.BookingEscrowController],
        providers: [escrow_service_1.EscrowService, fee_service_1.FeeService, iyzipay_service_1.IyzipayService, booking_escrow_service_1.BookingEscrowService],
        exports: [escrow_service_1.EscrowService, fee_service_1.FeeService, iyzipay_service_1.IyzipayService, booking_escrow_service_1.BookingEscrowService],
    })
], EscrowModule);
//# sourceMappingURL=escrow.module.js.map