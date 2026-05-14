"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_dispute_entity_1 = require("./job-dispute.entity");
const dispute_entity_1 = require("./dispute.entity");
const disputes_service_1 = require("./disputes.service");
const general_disputes_service_1 = require("./general-disputes.service");
const disputes_controller_1 = require("./disputes.controller");
const general_disputes_controller_1 = require("./general-disputes.controller");
const escrow_module_1 = require("../escrow/escrow.module");
const notifications_module_1 = require("../notifications/notifications.module");
const ai_module_1 = require("../ai/ai.module");
const user_entity_1 = require("../users/user.entity");
let DisputesModule = class DisputesModule {
};
exports.DisputesModule = DisputesModule;
exports.DisputesModule = DisputesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([job_dispute_entity_1.JobDispute, dispute_entity_1.Dispute, user_entity_1.User]),
            escrow_module_1.EscrowModule,
            notifications_module_1.NotificationsModule,
            ai_module_1.AiModule,
        ],
        controllers: [
            disputes_controller_1.AdminDisputesController,
            disputes_controller_1.DisputesController,
            general_disputes_controller_1.AdminGeneralDisputesController,
            general_disputes_controller_1.GeneralDisputesController,
        ],
        providers: [disputes_service_1.DisputesService, general_disputes_service_1.GeneralDisputesService],
        exports: [disputes_service_1.DisputesService, general_disputes_service_1.GeneralDisputesService],
    })
], DisputesModule);
//# sourceMappingURL=disputes.module.js.map