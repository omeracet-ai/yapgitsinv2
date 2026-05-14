"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const subscriptions_module_1 = require("../subscriptions/subscriptions.module");
const user_entity_1 = require("./user.entity");
const favorite_worker_entity_1 = require("./favorite-worker.entity");
const worker_insurance_entity_1 = require("./worker-insurance.entity");
const worker_certification_entity_1 = require("./worker-certification.entity");
const data_deletion_request_entity_1 = require("./data-deletion-request.entity");
const users_service_1 = require("./users.service");
const favorite_workers_service_1 = require("./favorite-workers.service");
const worker_insurance_service_1 = require("./worker-insurance.service");
const worker_certification_service_1 = require("./worker-certification.service");
const data_privacy_service_1 = require("./data-privacy.service");
const calendar_sync_service_1 = require("./calendar-sync.service");
const calendar_service_1 = require("./calendar.service");
const calendar_controller_1 = require("./calendar.controller");
const users_controller_1 = require("./users.controller");
const wallet_controller_1 = require("./wallet.controller");
const wallet_service_1 = require("./wallet.service");
const job_entity_1 = require("../jobs/job.entity");
const review_entity_1 = require("../reviews/review.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const chat_message_entity_1 = require("../chat/chat-message.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const payment_entity_1 = require("../payments/payment.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const job_lead_entity_1 = require("../leads/job-lead.entity");
const job_lead_response_entity_1 = require("../leads/job-lead-response.entity");
const data_export_controller_1 = require("./data-export.controller");
const data_export_service_1 = require("./data-export.service");
const earnings_service_1 = require("./earnings.service");
const ai_module_1 = require("../ai/ai.module");
const boost_module_1 = require("../boost/boost.module");
const availability_module_1 = require("../availability/availability.module");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User, favorite_worker_entity_1.FavoriteWorker, worker_insurance_entity_1.WorkerInsurance, worker_certification_entity_1.WorkerCertification, data_deletion_request_entity_1.DataDeletionRequest,
                job_entity_1.Job, review_entity_1.Review, offer_entity_1.Offer, booking_entity_1.Booking, notification_entity_1.Notification, chat_message_entity_1.ChatMessage, token_transaction_entity_1.TokenTransaction,
                payment_entity_1.Payment, payment_escrow_entity_1.PaymentEscrow, job_lead_entity_1.JobLead, job_lead_response_entity_1.JobLeadResponse,
            ]),
            ai_module_1.AiModule,
            boost_module_1.BoostModule,
            availability_module_1.AvailabilityModule,
            (0, common_1.forwardRef)(() => subscriptions_module_1.SubscriptionsModule),
        ],
        controllers: [calendar_controller_1.CalendarController, calendar_controller_1.CalendarPublicController, users_controller_1.UsersController, wallet_controller_1.WalletController, data_export_controller_1.DataExportController],
        providers: [users_service_1.UsersService, favorite_workers_service_1.FavoriteWorkersService, earnings_service_1.EarningsService, worker_insurance_service_1.WorkerInsuranceService, worker_certification_service_1.WorkerCertificationService, data_privacy_service_1.DataPrivacyService, calendar_sync_service_1.CalendarSyncService, calendar_service_1.CalendarService, wallet_service_1.WalletService, data_export_service_1.DataExportService],
        exports: [users_service_1.UsersService, worker_insurance_service_1.WorkerInsuranceService, worker_certification_service_1.WorkerCertificationService, data_privacy_service_1.DataPrivacyService, calendar_sync_service_1.CalendarSyncService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map