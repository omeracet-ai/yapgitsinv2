"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var SentryFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryFilter = void 0;
const common_1 = require("@nestjs/common");
const Sentry = __importStar(require("@sentry/node"));
let SentryFilter = SentryFilter_1 = class SentryFilter {
    logger = new common_1.Logger(SentryFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isHttp = exception instanceof common_1.HttpException;
        const status = isHttp
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        if (process.env.SENTRY_DSN &&
            process.env.NODE_ENV === 'production' &&
            status >= 500) {
            Sentry.withScope((scope) => {
                scope.addBreadcrumb({
                    category: 'http',
                    message: `${request.method} ${request.path}`,
                    level: 'info',
                    data: {
                        method: request.method,
                        path: request.path,
                        statusCode: status,
                    },
                });
                if (request.user?.id) {
                    scope.setUser({
                        id: String(request.user.id),
                        role: request.user.role,
                    });
                }
                scope.setTag('http.status', String(status));
                Sentry.captureException(exception);
            });
        }
        if (isHttp) {
            const res = exception.getResponse();
            response.status(status).json(typeof res === 'string' ? { statusCode: status, message: res } : res);
        }
        else {
            const err = exception;
            this.logger.error(err?.message ?? 'Unknown error', err?.stack);
            response.status(status).json({
                statusCode: status,
                message: 'Internal server error',
            });
        }
    }
};
exports.SentryFilter = SentryFilter;
exports.SentryFilter = SentryFilter = SentryFilter_1 = __decorate([
    (0, common_1.Catch)()
], SentryFilter);
//# sourceMappingURL=sentry.filter.js.map