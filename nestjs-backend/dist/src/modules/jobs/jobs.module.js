"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_entity_1 = require("./job.entity");
const offer_entity_1 = require("./offer.entity");
const job_question_entity_1 = require("./job-question.entity");
const job_question_reply_entity_1 = require("./job-question-reply.entity");
const saved_job_entity_1 = require("./saved-job.entity");
const jobs_service_1 = require("./jobs.service");
const jobs_controller_1 = require("./jobs.controller");
const offers_service_1 = require("./offers.service");
const offers_controller_1 = require("./offers.controller");
const questions_service_1 = require("./questions.service");
const questions_controller_1 = require("./questions.controller");
const saved_jobs_service_1 = require("./saved-jobs.service");
const users_module_1 = require("../users/users.module");
const tokens_module_1 = require("../tokens/tokens.module");
const notifications_module_1 = require("../notifications/notifications.module");
const escrow_module_1 = require("../escrow/escrow.module");
const cancellation_module_1 = require("../cancellation/cancellation.module");
const disputes_module_1 = require("../disputes/disputes.module");
const user_blocks_module_1 = require("../user-blocks/user-blocks.module");
const subscriptions_module_1 = require("../subscriptions/subscriptions.module");
const ai_module_1 = require("../ai/ai.module");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([job_entity_1.Job, offer_entity_1.Offer, job_question_entity_1.JobQuestion, job_question_reply_entity_1.JobQuestionReply, saved_job_entity_1.SavedJob]),
            users_module_1.UsersModule,
            tokens_module_1.TokensModule,
            notifications_module_1.NotificationsModule,
            escrow_module_1.EscrowModule,
            cancellation_module_1.CancellationModule,
            disputes_module_1.DisputesModule,
            user_blocks_module_1.UserBlocksModule,
            subscriptions_module_1.SubscriptionsModule,
            ai_module_1.AiModule,
        ],
        providers: [jobs_service_1.JobsService, offers_service_1.OffersService, questions_service_1.QuestionsService, saved_jobs_service_1.SavedJobsService],
        controllers: [jobs_controller_1.JobsController, offers_controller_1.OffersController, offers_controller_1.OffersRootController, questions_controller_1.QuestionsController],
        exports: [jobs_service_1.JobsService, offers_service_1.OffersService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map