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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantMiddleware = void 0;
const common_1 = require("@nestjs/common");
const tenants_service_1 = require("../modules/tenants/tenants.service");
let TenantMiddleware = class TenantMiddleware {
    tenants;
    constructor(tenants) {
        this.tenants = tenants;
    }
    async use(req, _res, next) {
        let tenant = null;
        const headerSlug = req.headers['x-tenant-slug']?.trim();
        if (headerSlug) {
            tenant = await this.tenants.findBySlug(headerSlug);
        }
        if (!tenant) {
            const host = (req.headers['host'] || '').toString().split(':')[0].toLowerCase();
            if (host) {
                tenant = await this.tenants.findBySubdomain(host);
                if (!tenant) {
                    const parts = host.split('.');
                    if (parts.length >= 2) {
                        const sub = parts[0];
                        if (sub && sub !== 'www' && sub !== 'localhost') {
                            tenant = await this.tenants.findBySlug(sub);
                        }
                    }
                }
            }
        }
        if (!tenant) {
            tenant = await this.tenants.getDefault();
        }
        if (tenant) {
            req.tenant = tenant;
        }
        next();
    }
};
exports.TenantMiddleware = TenantMiddleware;
exports.TenantMiddleware = TenantMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantMiddleware);
//# sourceMappingURL=tenant.middleware.js.map