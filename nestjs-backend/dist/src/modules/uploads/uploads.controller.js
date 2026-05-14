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
const throttler_1 = require("@nestjs/throttler");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const uploads_service_1 = require("./uploads.service");
const image_pipeline_1 = require("../../common/image-pipeline");
const sharp = require('sharp');
function buildFileName(userId, city) {
    const safe = (city ?? 'tr')
        .toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 20);
    return `${userId.substring(0, 8)}_${safe}_${Date.now()}`;
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
    uploadsService;
    constructor(uploadsService) {
        this.uploadsService = uploadsService;
    }
    async uploadCompletionPhotos(jobId, files, req) {
        return this.uploadsService.uploadCompletionPhotos(jobId, files, req.user.id);
    }
    async uploadJobPhotos(files, req) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('En az 1 fotoğraf yüklenmelidir');
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'jobs');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const urls = [];
        for (const file of files) {
            const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            await (0, image_pipeline_1.processImage)(file.buffer, dir, baseName);
            urls.push(`${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/jobs/${baseName}.jpg`);
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
            urls.push(`${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/jobs/${filename}`);
        }
        return urls;
    }
    async uploadPortfolioPhoto(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Fotoğraf seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'portfolio', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await (0, image_pipeline_1.processImage)(file.buffer, dir, baseName);
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/portfolio/${folder}/${baseName}.jpg`,
        };
    }
    async uploadPortfolioVideo(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Video seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'portfolio-videos', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extMap = {
            'video/mp4': 'mp4',
            'video/quicktime': 'mov',
            'video/webm': 'webm',
        };
        const ext = extMap[file.mimetype] || 'mp4';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const dest = (0, path_1.join)(dir, filename);
        fs.writeFileSync(dest, file.buffer);
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/portfolio-videos/${folder}/${filename}`,
        };
    }
    async uploadIntroVideo(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Video seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'intro-videos', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extMap = {
            'video/mp4': 'mp4',
            'video/quicktime': 'mov',
            'video/webm': 'webm',
        };
        const ext = extMap[file.mimetype] || 'mp4';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const dest = (0, path_1.join)(dir, filename);
        fs.writeFileSync(dest, file.buffer);
        const durationRaw = (req.body?.duration ?? '');
        const durationParsed = durationRaw ? parseInt(durationRaw, 10) : NaN;
        const duration = Number.isFinite(durationParsed) ? durationParsed : undefined;
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/intro-videos/${folder}/${filename}`,
            duration,
        };
    }
    async uploadProfilePhoto(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Profil fotoğrafı seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'profile', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const baseName = `profile-${Date.now()}`;
        await (0, image_pipeline_1.processImage)(file.buffer, dir, baseName, {
            sizes: [512, 256, 128],
            cover: 512,
        });
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/profile/${folder}/${baseName}.jpg`,
        };
    }
    async uploadProfileVideo(file, req) {
        const durationRaw = (req.body?.duration ?? '');
        const durationParsed = durationRaw ? parseInt(durationRaw, 10) : NaN;
        const duration = Number.isFinite(durationParsed) ? durationParsed : undefined;
        return this.uploadsService.uploadProfileVideo(file, req.user.id, duration);
    }
    async uploadIdentityPhoto(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Kimlik fotoğrafı zorunludur');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'identity', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const dest = (0, path_1.join)(dir, 'kimlik.jpg');
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(dest);
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/identity/${folder}/kimlik.jpg`,
        };
    }
    async uploadOnboardingImage(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Görsel seçilmedi');
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'onboarding');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await (0, image_pipeline_1.processImage)(file.buffer, dir, baseName, {
            sizes: [1200, 800, 400],
            jpegQuality: 82,
        });
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/onboarding/${baseName}.jpg`,
        };
    }
    async uploadChatAttachment(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Dosya seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'chat-attachments', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const isImage = file.mimetype.startsWith('image/');
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        let filename;
        let finalSize;
        if (isImage) {
            filename = `${ts}-${rand}.jpg`;
            const dest = (0, path_1.join)(dir, filename);
            await sharp(file.buffer)
                .resize({ width: 1024, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(dest);
            finalSize = fs.statSync(dest).size;
        }
        else {
            const extMap = {
                'application/pdf': 'pdf',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            };
            const ext = extMap[file.mimetype] || 'bin';
            filename = `${ts}-${rand}.${ext}`;
            const dest = (0, path_1.join)(dir, filename);
            fs.writeFileSync(dest, file.buffer);
            finalSize = file.size;
        }
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/chat-attachments/${folder}/${filename}`,
            type: isImage ? 'image' : 'document',
            name: file.originalname || filename,
            size: finalSize,
        };
    }
    async uploadChatAudio(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Ses dosyası seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'chat-audio', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extMap = {
            'audio/mpeg': 'mp3',
            'audio/mp4': 'm4a',
            'audio/m4a': 'm4a',
            'audio/x-m4a': 'm4a',
            'audio/aac': 'aac',
            'audio/ogg': 'ogg',
            'audio/webm': 'webm',
        };
        const ext = extMap[file.mimetype] || 'bin';
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        const filename = `${ts}-${rand}.${ext}`;
        const dest = (0, path_1.join)(dir, filename);
        fs.writeFileSync(dest, file.buffer);
        const durationRaw = (req.body?.duration ?? '');
        const durationParsed = durationRaw ? parseInt(durationRaw, 10) : NaN;
        const duration = Number.isFinite(durationParsed) ? durationParsed : undefined;
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/chat-audio/${folder}/${filename}`,
            type: 'audio',
            name: file.originalname || filename,
            size: file.size,
            duration,
        };
    }
    async uploadCertification(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Sertifika dosyası seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'certifications', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extMap = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
        };
        const ext = extMap[file.mimetype] || 'bin';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const dest = (0, path_1.join)(dir, filename);
        fs.writeFileSync(dest, file.buffer);
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/certifications/${folder}/${filename}`,
            name: file.originalname || filename,
            size: file.size,
        };
    }
    async uploadDocument(file, req) {
        if (!file)
            throw new common_1.BadRequestException('Belge fotoğrafı seçilmedi');
        const folder = buildFileName(req.user.id, req.user.city);
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'identity', folder);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const dest = (0, path_1.join)(dir, 'belge.jpg');
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(dest);
        return {
            url: `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/uploads/identity/${folder}/belge.jpg`,
        };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('completion-photos/:jobId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 5, {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 8 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadCompletionPhotos", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('job-photos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 5, {
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
    (0, common_1.Post)('portfolio'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 8 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadPortfolioPhoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('portfolio-video'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^video\/(mp4|quicktime|webm)$/)) {
                return cb(new common_1.BadRequestException('Sadece video dosyaları yüklenebilir (mp4, mov, webm)'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadPortfolioVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('intro-video'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^video\/(mp4|quicktime|webm)$/)) {
                return cb(new common_1.BadRequestException('Sadece video dosyaları yüklenebilir (mp4, mov, webm)'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadIntroVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('profile-photo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: imageFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadProfilePhoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('profile-video'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^video\/(mp4|quicktime|x-msvideo|mpeg)$/)) {
                return cb(new common_1.BadRequestException('Sadece video dosyaları yüklenebilir (mp4, mov, avi, mpeg)'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 60 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadProfileVideo", null);
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
    (0, common_1.Post)('chat-attachment'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            const imageMimes = ['image/jpeg', 'image/png', 'image/webp'];
            const docMimes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
            if (!imageMimes.includes(file.mimetype) &&
                !docMimes.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Sadece resim (jpg/png/webp) veya belge (pdf/doc/docx) yüklenebilir'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadChatAttachment", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('chat-audio'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            const audioMimes = [
                'audio/mpeg',
                'audio/mp4',
                'audio/m4a',
                'audio/x-m4a',
                'audio/aac',
                'audio/ogg',
                'audio/webm',
            ];
            if (!audioMimes.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Sadece ses dosyası yüklenebilir (mp3/m4a/aac/ogg/webm)'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadChatAudio", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('certification'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (req, file, cb) => {
            const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowed.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Sadece PDF/JPG/PNG yüklenebilir'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadCertification", null);
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
    (0, throttler_1.Throttle)({ uploads: { limit: 30, ttl: 60_000 } }),
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map