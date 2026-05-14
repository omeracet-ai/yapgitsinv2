"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const job_templates_service_1 = require("./job-templates.service");
const job_template_dto_1 = require("./dto/job-template.dto");
let JobTemplatesController = class JobTemplatesController {
    service;
    constructor(service) {
        this.service = service;
    }
    findMy(req) {
        return this.service.findMy(req.user.id);
    }
    findOne(id, req) {
        return this.service.findOne(id, req.user.id);
    }
    create(dto, req) {
        return this.service.create(dto, req.user.id);
    }
    update(id, dto, req) {
        return this.service.update(id, dto, req.user.id);
    }
    remove(id, req) {
        return this.service.remove(id, req.user.id);
    }
    instantiate(id, req) {
        return this.service.instantiate(id, req.user.id);
    }
};
exports.JobTemplatesController = JobTemplatesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "findMy", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [job_template_dto_1.CreateJobTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, job_template_dto_1.UpdateJobTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/instantiate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobTemplatesController.prototype, "instantiate", null);
exports.JobTemplatesController = JobTemplatesController = __decorate([
    (0, common_1.Controller)('job-templates'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [job_templates_service_1.JobTemplatesService])
], JobTemplatesController);
//# sourceMappingURL=job-templates.controller.js.map