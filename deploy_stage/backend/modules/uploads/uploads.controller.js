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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const passport_1 = require("@nestjs/passport");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const sharp = require('sharp');
function sanitizeName(name) {
    return (name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9À-ž-]/g, '')
        .substring(0, 60) || 'user');
}
const imageFilter = (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        return cb(new common_1.BadRequestException('Sadece resim dosyaları yüklenebilir'), false);
    }
    cb(null, true);
};
const videoFilter = (req, file, cb) => {
    if (!file.mimetype.match(/^video\/(mp4|quicktime|x-msvideo|mpeg)$/)) {
        return cb(new common_1.BadRequestException('Sadece video dosyaları yüklenebilir (mp4, mov, avi, mpeg)'), false);
    }
    cb(null, true);
};
let UploadsController = class UploadsController {
    async uploadJobPhotos(files, req) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('En az 1 fotoğraf yüklenmelidir');
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'jobs');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const urls = [];
        for (const file of files) {
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const dest = (0, path_1.join)(dir, filename);
            await sharp(file.buffer)
                .resize({ width: 1024, withoutEnlargement: true })
                .jpeg({ quality: 75 })
                .toFile(dest);
            urls.push(`${req.protocol}://${req.get('host')}/uploads/jobs/${filename}`);
        }
        return urls;
    }
    async uploadJobVideos(files, req) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('En az 1 video yüklenmelidir');
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'jobs');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const urls = [];
        for (const file of files) {
            const ext = file.originalname.split('.').pop() || 'mp4';
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const dest = (0, path_1.join)(dir, filename);
            fs.writeFileSync(dest, file.buffer);
            urls.push(`${req.protocol}://${req.get('host')}/uploads/jobs/${filename}`);
        }
        return urls;
    }
    async uploadIdentityPhoto(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Kimlik fotoğrafı zorunludur');
        const fullName = String(req.user?.fullName || 'user');
        const folder = sanitizeName(fullName);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'identity', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const dest = (0, path_1.join)(dir, 'kimlik.jpg');
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(dest);
        return {
            url: `${req.protocol}://${req.get('host')}/uploads/identity/${folder}/kimlik.jpg`,
        };
    }
    async uploadOnboardingImage(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Görsel seçilmedi');
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'onboarding');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const dest = (0, path_1.join)(dir, filename);
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toFile(dest);
        return {
            url: `${req.protocol}://${req.get('host')}/uploads/onboarding/${filename}`,
        };
    }
    async uploadDocument(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Belge fotoğrafı seçilmedi');
        const fullName = String(req.user?.fullName || 'user');
        const folder = sanitizeName(fullName);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'identity', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const dest = (0, path_1.join)(dir, 'belge.jpg');
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(dest);
        return {
            url: `${req.protocol}://${req.get('host')}/uploads/identity/${folder}/belge.jpg`,
        };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('job-photos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 20, {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 8 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadJobPhotos", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('job-video'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('videos', 5, {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: videoFilter,
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadJobVideos", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('identity-photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadIdentityPhoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('onboarding-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadOnboardingImage", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('document'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadDocument", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('uploads')
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map