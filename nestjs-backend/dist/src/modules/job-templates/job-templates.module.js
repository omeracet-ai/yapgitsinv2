"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobTemplatesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_template_entity_1 = require("./job-template.entity");
const job_templates_service_1 = require("./job-templates.service");
const job_templates_controller_1 = require("./job-templates.controller");
const jobs_module_1 = require("../jobs/jobs.module");
let JobTemplatesModule = class JobTemplatesModule {
};
exports.JobTemplatesModule = JobTemplatesModule;
exports.JobTemplatesModule = JobTemplatesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([job_template_entity_1.JobTemplate]), jobs_module_1.JobsModule],
        providers: [job_templates_service_1.JobTemplatesService],
        controllers: [job_templates_controller_1.JobTemplatesController],
        exports: [job_templates_service_1.JobTemplatesService],
    })
], JobTemplatesModule);
//# sourceMappingURL=job-templates.module.js.map