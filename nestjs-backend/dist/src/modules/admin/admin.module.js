"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const user_entity_1 = require("../users/user.entity");
const service_request_entity_1 = require("../service-requests/service-request.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const review_entity_1 = require("../reviews/review.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const chat_message_entity_1 = require("../chat/chat-message.entity");
const job_question_entity_1 = require("../jobs/job-question.entity");
const provider_entity_1 = require("../providers/provider.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const admin_audit_log_entity_1 = require("../admin-audit/admin-audit-log.entity");
const categories_module_1 = require("../categories/categories.module");
const providers_module_1 = require("../providers/providers.module");
const promo_module_1 = require("../promo/promo.module");
const user_blocks_module_1 = require("../user-blocks/user-blocks.module");
const users_module_1 = require("../users/users.module");
const notifications_module_1 = require("../notifications/notifications.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job, offer_entity_1.Offer, user_entity_1.User, service_request_entity_1.ServiceRequest, booking_entity_1.Booking, review_entity_1.Review, payment_escrow_entity_1.PaymentEscrow, chat_message_entity_1.ChatMessage, job_question_entity_1.JobQuestion, notification_entity_1.Notification, admin_audit_log_entity_1.AdminAuditLog, provider_entity_1.Provider]),
            categories_module_1.CategoriesModule,
            providers_module_1.ProvidersModule,
            promo_module_1.PromoModule,
            user_blocks_module_1.UserBlocksModule,
            users_module_1.UsersModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map