"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const service_request_entity_1 = require("./service-request.entity");
const service_request_application_entity_1 = require("./service-request-application.entity");
const service_requests_service_1 = require("./service-requests.service");
const service_requests_controller_1 = require("./service-requests.controller");
let ServiceRequestsModule = class ServiceRequestsModule {
};
exports.ServiceRequestsModule = ServiceRequestsModule;
exports.ServiceRequestsModule = ServiceRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([service_request_entity_1.ServiceRequest, service_request_application_entity_1.ServiceRequestApplication])],
        controllers: [service_requests_controller_1.ServiceRequestsController],
        providers: [service_requests_service_1.ServiceRequestsService],
        exports: [service_requests_service_1.ServiceRequestsService],
    })
], ServiceRequestsModule);
//# sourceMappingURL=service-requests.module.js.map