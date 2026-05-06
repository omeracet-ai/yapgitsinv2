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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const path_1 = require("path");
const fs = __importStar(require("fs"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('HizmetApp API')
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
        customSiteTitle: 'HizmetApp API Docs',
        customCss: '.swagger-ui .topbar { background-color: #007DFE; }',
    });
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : true;
    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app.getHttpServer()));
    const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads', 'jobs');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 HizmetApp API: http://localhost:${port}`);
    console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map