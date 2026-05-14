"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const review_entity_1 = require("../reviews/review.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const saved_job_search_entity_1 = require("../favorites/saved-job-search.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const review_reminder_service_1 = require("./review-reminder.service");
const saved_search_alert_service_1 = require("./saved-search-alert.service");
const boost_expiry_service_1 = require("./boost-expiry.service");
const worker_boost_expiry_service_1 = require("./worker-boost-expiry.service");
const booking_reminder_service_1 = require("./booking-reminder.service");
const boost_module_1 = require("../boost/boost.module");
let CronModule = class CronModule {
};
exports.CronModule = CronModule;
exports.CronModule = CronModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job, offer_entity_1.Offer, review_entity_1.Review, notification_entity_1.Notification, saved_job_search_entity_1.SavedJobSearch, booking_entity_1.Booking]),
            boost_module_1.BoostModule,
        ],
        providers: [
            review_reminder_service_1.ReviewReminderService,
            saved_search_alert_service_1.SavedSearchAlertService,
            boost_expiry_service_1.BoostExpiryService,
            worker_boost_expiry_service_1.WorkerBoostExpiryService,
            booking_reminder_service_1.BookingReminderService,
        ],
    })
], CronModule);
//# sourceMappingURL=cron.module.js.map