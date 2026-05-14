"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lead_request_entity_1 = require("./lead-request.entity");
const job_lead_entity_1 = require("./job-lead.entity");
const job_lead_response_entity_1 = require("./job-lead-response.entity");
const leads_service_1 = require("./leads.service");
const job_leads_service_1 = require("./job-leads.service");
const leads_controller_1 = require("./leads.controller");
const user_entity_1 = require("../users/user.entity");
const notifications_module_1 = require("../notifications/notifications.module");
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([lead_request_entity_1.LeadRequest, job_lead_entity_1.JobLead, job_lead_response_entity_1.JobLeadResponse, user_entity_1.User]),
            notifications_module_1.NotificationsModule,
        ],
        controllers: [leads_controller_1.LeadsController],
        providers: [leads_service_1.LeadsService, job_leads_service_1.JobLeadsService],
        exports: [leads_service_1.LeadsService, job_leads_service_1.JobLeadsService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map