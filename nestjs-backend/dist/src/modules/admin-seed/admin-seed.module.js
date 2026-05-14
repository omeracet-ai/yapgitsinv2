"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminSeedModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSeedModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const payment_entity_1 = require("../payments/payment.entity");
const review_entity_1 = require("../reviews/review.entity");
const job_lead_entity_1 = require("../leads/job-lead.entity");
const job_lead_response_entity_1 = require("../leads/job-lead-response.entity");
const category_entity_1 = require("../categories/category.entity");
const admin_seed_controller_1 = require("./admin-seed.controller");
const admin_seed_service_1 = require("./admin-seed.service");
let AdminSeedModule = AdminSeedModule_1 = class AdminSeedModule {
    logger = new common_1.Logger(AdminSeedModule_1.name);
    onModuleInit() {
        if (process.env.ALLOW_SEED === '1') {
            this.logger.warn('[WARN] AdminSeedController is in BOOTSTRAP MODE (ALLOW_SEED=1). Disable after use.');
        }
    }
};
exports.AdminSeedModule = AdminSeedModule;
exports.AdminSeedModule = AdminSeedModule = AdminSeedModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                booking_entity_1.Booking,
                payment_escrow_entity_1.PaymentEscrow,
                payment_entity_1.Payment,
                review_entity_1.Review,
                job_lead_entity_1.JobLead,
                job_lead_response_entity_1.JobLeadResponse,
                category_entity_1.Category,
            ]),
        ],
        controllers: [admin_seed_controller_1.AdminSeedController],
        providers: [admin_seed_service_1.AdminSeedService],
    })
], AdminSeedModule);
//# sourceMappingURL=admin-seed.module.js.map