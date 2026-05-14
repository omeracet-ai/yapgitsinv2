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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const common_1 = require("@nestjs/common");
const core_2 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const helmet_1 = __importDefault(require("helmet"));
const Sentry = __importStar(require("@sentry/node"));
const sentry_filter_1 = require("./common/sentry.filter");
const paths_1 = require("./common/paths");
const SENTRY_ENABLED = !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production';
if (SENTRY_ENABLED) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.05,
        release: process.env.GIT_SHA || 'unknown',
    });
}
process.on('uncaughtException', (err) => {
    console.error('[boot] uncaughtException:', err && err.stack ? err.stack : err);
    if (SENTRY_ENABLED) {
        try {
            Sentry.captureException(err);
        }
        catch {
        }
    }
});
process.on('unhandledRejection', (reason) => {
    console.error('[boot] unhandledRejection:', reason);
    if (SENTRY_ENABLED) {
        try {
            Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
        }
        catch {
        }
    }
});
async function bootstrap() {
    console.log('[boot] starting NestJS, node=' + process.version + ' pid=' + process.pid);
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    console.log('[boot] Nest app created');
    app.useGlobalFilters(new sentry_filter_1.SentryFilter());
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        frameguard: { action: 'sameorigin' },
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://www.googletagmanager.com',
                    'https://plausible.io',
                ],
                connectSrc: [
                    "'self'",
                    'https://yapgitsin.tr',
                    'wss://yapgitsin.tr',
                    'https://plausible.io',
                ],
                styleSrc: ["'self'", "'unsafe-inline'"],
                frameSrc: [
                    "'self'",
                    'https://sandbox-api.iyzipay.com',
                    'https://api.iyzipay.com',
                ],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
        },
    }));
    console.log('[boot] helmet ready');
    const isProd = process.env.NODE_ENV === 'production';
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new common_1.ClassSerializerInterceptor(app.get(core_2.Reflector)));
    if (!isProd) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Yapgitsin API')
            .setDescription('Yapgitsin v2 — Türkiye hizmet marketplace platformu REST API dökümantasyonu.\n\n' +
            '**Auth:** JWT Bearer token ile kimlik doğrulama.\n\n' +
            '**Test kullanıcıları:** fatma@test.com / mehmet@test.com (şifre: Test1234)')
            .setVersion('2.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
            .addTag('Auth', 'Kimlik doğrulama — login, register, admin login')
            .addTag('Users', 'Kullanıcı profili ve usta dizini')
            .addTag('Jobs', 'İş ilanları ve teklifler')
            .addTag('Service Requests', 'Hizmet talepleri ve başvurular')
            .addTag('Bookings', 'Randevu yönetimi')
            .addTag('Reviews', 'Değerlendirme ve puanlama')
            .addTag('Categories', 'Hizmet kategorileri')
            .addTag('Tokens', 'Token bakiyesi ve satın alma')
            .addTag('Notifications', 'Bildirim yönetimi')
            .addTag('Uploads', 'Dosya yükleme (fotoğraf)')
            .addTag('AI', 'Yapay zeka özellikleri')
            .addTag('Admin', 'Admin panel yönetimi')
            .addTag('Chat', 'WebSocket sohbet')
            .addTag('Payments', 'İyzipay ödeme entegrasyonu')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            customSiteTitle: 'Yapgitsin API Docs',
            customCss: '.swagger-ui .topbar { background-color: #007DFE; }',
        });
    }
    const rawOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
    const NATIVE_APP_SCHEMES = ['capacitor://', 'ionic://', 'ms-appx://', 'ms-appx-web://', 'file://'];
    const isNativeAppScheme = (o) => NATIVE_APP_SCHEMES.some((s) => o.startsWith(s));
    if (isProd) {
        if (rawOrigins.length === 0) {
            throw new Error('Production requires ALLOWED_ORIGINS env (comma-separated list)');
        }
        const bad = rawOrigins.find((o) => !isNativeAppScheme(o) &&
            (o === '*' || o.startsWith('http://') || /localhost|127\.0\.0\.1/.test(o)));
        if (bad) {
            throw new Error(`Production ALLOWED_ORIGINS rejects "${bad}" (no *, http://, plain localhost, plain 127.0.0.1 — capacitor:// vb. native scheme'ler izinli)`);
        }
    }
    console.log(`[boot] CORS allowlist (prod=${isProd}): [${rawOrigins.join(', ')}] + native(${NATIVE_APP_SCHEMES.join(',')})`);
    const originFn = (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (!isProd) {
            if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin))
                return cb(null, true);
            if (/^capacitor:\/\//.test(origin))
                return cb(null, true);
            if (rawOrigins.length === 0)
                return cb(null, true);
        }
        if (rawOrigins.includes(origin))
            return cb(null, true);
        if (isNativeAppScheme(origin))
            return cb(null, true);
        return cb(null, false);
    };
    app.enableCors({
        origin: originFn,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Authorization,Content-Type,Accept,X-Requested-With,sentry-trace,baggage',
        exposedHeaders: 'X-Total-Count,Content-Range',
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app.getHttpServer()));
    app.set('trust proxy', 1);
    const uploadsDir = (0, path_1.join)(paths_1.APP_ROOT, 'uploads', 'jobs');
    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
    }
    catch (e) {
        console.warn('[boot] uploads dir create failed (uploads will be unavailable):', e instanceof Error ? e.message : e);
    }
    app.useStaticAssets((0, path_1.join)(paths_1.APP_ROOT, 'uploads'), { prefix: '/uploads' });
    const globalPrefix = process.env.GLOBAL_PREFIX;
    if (globalPrefix)
        app.setGlobalPrefix(globalPrefix, { exclude: ['health'] });
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`[boot] listening on port ${port} pid ${process.pid}`);
    console.log(`🚀 Yapgitsin API: http://localhost:${port}`);
    console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
void bootstrap().catch((err) => {
    console.error('[boot] bootstrap failed:', err && err.stack ? err.stack : err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map