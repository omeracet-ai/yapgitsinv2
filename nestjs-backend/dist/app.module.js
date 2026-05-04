"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const chat_module_1 = require("./modules/chat/chat.module");
const user_entity_1 = require("./modules/users/user.entity");
const job_entity_1 = require("./modules/jobs/job.entity");
const offer_entity_1 = require("./modules/jobs/offer.entity");
const payments_module_1 = require("./modules/payments/payments.module");
const review_entity_1 = require("./modules/reviews/review.entity");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const ai_module_1 = require("./modules/ai/ai.module");
const category_entity_1 = require("./modules/categories/category.entity");
const categories_module_1 = require("./modules/categories/categories.module");
const admin_module_1 = require("./modules/admin/admin.module");
const tokens_module_1 = require("./modules/tokens/tokens.module");
const token_transaction_entity_1 = require("./modules/tokens/token-transaction.entity");
const uploads_module_1 = require("./modules/uploads/uploads.module");
const service_request_entity_1 = require("./modules/service-requests/service-request.entity");
const service_request_application_entity_1 = require("./modules/service-requests/service-request-application.entity");
const service_requests_module_1 = require("./modules/service-requests/service-requests.module");
const booking_entity_1 = require("./modules/bookings/booking.entity");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const notification_entity_1 = require("./modules/notifications/notification.entity");
const notifications_module_1 = require("./modules/notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const dbType = configService.get('DB_TYPE') || 'postgres';
                    const entities = [user_entity_1.User, job_entity_1.Job, offer_entity_1.Offer, review_entity_1.Review, category_entity_1.Category, token_transaction_entity_1.TokenTransaction, service_request_entity_1.ServiceRequest, service_request_application_entity_1.ServiceRequestApplication, booking_entity_1.Booking, notification_entity_1.Notification];
                    if (dbType === 'sqlite') {
                        return { type: 'sqlite', database: 'hizmet_db.sqlite', entities, synchronize: true };
                    }
                    return {
                        type: 'postgres',
                        host: configService.get('DB_HOST'),
                        port: configService.get('DB_PORT'),
                        username: configService.get('DB_USERNAME'),
                        password: configService.get('DB_PASSWORD'),
                        database: configService.get('DB_DATABASE'),
                        entities,
                        synchronize: true,
                    };
                },
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            jobs_module_1.JobsModule,
            chat_module_1.ChatModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.ReviewsModule,
            ai_module_1.AiModule,
            categories_module_1.CategoriesModule,
            admin_module_1.AdminModule,
            tokens_module_1.TokensModule,
            uploads_module_1.UploadsModule,
            service_requests_module_1.ServiceRequestsModule,
            bookings_module_1.BookingsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map