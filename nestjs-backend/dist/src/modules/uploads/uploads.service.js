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
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const sharp = require('sharp');
let UploadsService = class UploadsService {
    jobsRepository;
    offersRepository;
    constructor(jobsRepository, offersRepository) {
        this.jobsRepository = jobsRepository;
        this.offersRepository = offersRepository;
    }
    async uploadCompletionPhotos(jobId, files, userId) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('En az 1 fotoğraf yüklenmelidir');
        }
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.status !== job_entity_1.JobStatus.IN_PROGRESS &&
            job.status !== job_entity_1.JobStatus.PENDING_COMPLETION) {
            throw new common_1.ForbiddenException('Tamamlanma fotoğrafları yalnızca devam eden işlerde yüklenebilir');
        }
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        if (!acceptedOffer || acceptedOffer.userId !== userId) {
            throw new common_1.ForbiddenException('Bu işin atanmış ustası değilsiniz');
        }
        const current = job.completionPhotos ?? [];
        if (current.length + files.length > 5) {
            throw new common_1.BadRequestException('Maks 5 fotoğraf');
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'completion', jobId);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const newUrls = [];
        const ts = Date.now();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = `${ts}-${i}.jpg`;
            const dest = (0, path_1.join)(dir, filename);
            await sharp(file.buffer)
                .resize({ width: 1024, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(dest);
            newUrls.push(`/uploads/completion/${jobId}/${filename}`);
        }
        job.completionPhotos = [...current, ...newUrls];
        await this.jobsRepository.save(job);
        return { photos: job.completionPhotos };
    }
    async uploadProfileVideo(file, userId, durationSeconds) {
        if (!file) {
            throw new common_1.BadRequestException('Video seçilmedi');
        }
        if (file.size > 60 * 1024 * 1024) {
            throw new common_1.BadRequestException('Video maksimum 60MB olabilir');
        }
        if (durationSeconds !== undefined && durationSeconds > 60) {
            throw new common_1.BadRequestException(`Video maksimum 60 saniye olabilir (${durationSeconds}s sağlandı)`);
        }
        const validMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
        if (!validMimes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Sadece MP4, MOV, AVI, MPEG formatları desteklenir');
        }
        const fullName = userId;
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'profile-videos', fullName);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extMap = {
            'video/mp4': 'mp4',
            'video/quicktime': 'mov',
            'video/x-msvideo': 'avi',
            'video/mpeg': 'mpeg',
        };
        const ext = extMap[file.mimetype] || 'mp4';
        const filename = `profile-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const dest = (0, path_1.join)(dir, filename);
        fs.writeFileSync(dest, file.buffer);
        return {
            url: `/uploads/profile-videos/${fullName}/${filename}`,
            duration: durationSeconds,
        };
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map