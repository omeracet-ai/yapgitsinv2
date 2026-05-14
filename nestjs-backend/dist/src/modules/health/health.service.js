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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const typeorm_2 = require("typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
let version = '0.0.1';
try {
    const pkgPath = (0, path_1.join)(__dirname, '../..', 'package.json');
    const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
    version = pkg.version;
}
catch {
}
let HealthService = HealthService_1 = class HealthService {
    dataSource;
    cache;
    logger = new common_1.Logger(HealthService_1.name);
    constructor(dataSource, cache) {
        this.dataSource = dataSource;
        this.cache = cache;
    }
    buildSha() {
        return process.env.GIT_SHA || 'unknown';
    }
    async checkDatabase() {
        try {
            await this.dataSource.query('SELECT 1');
            return 'ok';
        }
        catch (e) {
            this.logger.warn(`DB health check failed: ${e.message}`);
            return 'down';
        }
    }
    async checkCache() {
        const redisConfigured = !!process.env.REDIS_URL?.trim();
        try {
            const key = '__health_ping__';
            await this.cache.set(key, '1', 1000);
            const v = await this.cache.get(key);
            if (v !== '1') {
                return redisConfigured ? 'down' : 'memory-fallback';
            }
            return redisConfigured ? 'ok' : 'memory-fallback';
        }
        catch {
            return redisConfigured ? 'down' : 'memory-fallback';
        }
    }
    checkIyzipay() {
        if (process.env.MOCK_IYZIPAY === '1')
            return 'mock';
        if (process.env.IYZIPAY_API_KEY && process.env.IYZIPAY_SECRET_KEY) {
            return 'configured';
        }
        return 'missing';
    }
    async getHealth() {
        const [database, cache] = await Promise.all([
            this.checkDatabase(),
            this.checkCache(),
        ]);
        const iyzipay = this.checkIyzipay();
        let status = 'ok';
        if (database === 'down')
            status = 'down';
        else if (cache === 'down' || iyzipay === 'missing')
            status = 'degraded';
        return {
            status,
            uptime: Math.floor(process.uptime() * 10) / 10,
            version,
            buildSha: this.buildSha(),
            checks: { database, cache, iyzipay },
            timestamp: new Date().toISOString(),
        };
    }
    async getDeepHealth() {
        const shallow = await this.getHealth();
        let iyzipayDeep = {
            status: 'skipped',
            latencyMs: 0,
        };
        if (process.env.MOCK_IYZIPAY === '1') {
            iyzipayDeep = { status: 'mock', latencyMs: 0 };
        }
        else if (process.env.IYZIPAY_API_KEY &&
            process.env.IYZIPAY_SECRET_KEY &&
            process.env.IYZIPAY_URI) {
            const start = Date.now();
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 3000);
                const res = await fetch(process.env.IYZIPAY_URI, {
                    method: 'GET',
                    signal: ctrl.signal,
                });
                clearTimeout(t);
                iyzipayDeep = {
                    status: res.status < 500 ? 'ok' : 'down',
                    latencyMs: Date.now() - start,
                };
            }
            catch (e) {
                iyzipayDeep = {
                    status: 'down',
                    latencyMs: Date.now() - start,
                    error: e.message,
                };
            }
        }
        else {
            iyzipayDeep = { status: 'missing', latencyMs: 0 };
        }
        const smtp = process.env.SMTP_HOST && process.env.SMTP_USER
            ? { status: 'configured' }
            : { status: 'missing' };
        const fcm = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVICE_ACCOUNT
            ? { status: 'configured' }
            : { status: 'missing' };
        return {
            ...shallow,
            deep: { iyzipay: iyzipayDeep, smtp, fcm },
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.DataSource, Object])
], HealthService);
//# sourceMappingURL=health.service.js.map