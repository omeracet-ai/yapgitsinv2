/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Req,
  Request,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { UploadsService } from './uploads.service';
import { processImage } from '../../common/image-pipeline';

const sharp = require('sharp');

function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9À-ž-]/g, '')
      .substring(0, 60) || 'user'
  );
}

const imageFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    return cb(
      new BadRequestException('Sadece resim dosyaları yüklenebilir'),
      false,
    );
  }
  cb(null, true);
};

const videoFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/^video\/(mp4|quicktime|x-msvideo|mpeg)$/)) {
    return cb(
      new BadRequestException('Sadece video dosyaları yüklenebilir (mp4, mov, avi, mpeg)'),
      false,
    );
  }
  cb(null, true);
};

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /** POST /uploads/completion-photos/:jobId — Phase 19 tamamlanma fotoğrafları */
  @UseGuards(AuthGuard('jwt'))
  @Post('completion-photos/:jobId')
  @UseInterceptors(
    FilesInterceptor('photos', 5, {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadCompletionPhotos(
    @Param('jobId') jobId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    return this.uploadsService.uploadCompletionPhotos(jobId, files, req.user.id);
  }

  /** POST /uploads/job-photos  — iş ilanı fotoğrafları (sınırsız) */
  @UseGuards(AuthGuard('jwt'))
  @Post('job-photos')
  @UseInterceptors(
    FilesInterceptor('photos', 20, {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadJobPhotos(
    @UploadedFiles() files: any[],
    @Req() req: any,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('En az 1 fotoğraf yüklenmelidir');
    }
    const dir = join(process.cwd(), 'uploads', 'jobs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Phase 96: render JPEG/WebP/AVIF @ 1024/640/320 + legacy <name>.jpg
      await processImage(file.buffer, dir, baseName);
      urls.push(
        `${req.protocol}://${req.get('host')}/uploads/jobs/${baseName}.jpg`,
      );
    }
    return urls;
  }

  /** POST /uploads/job-video  — iş ilanı videoları (sınırsız) */
  @UseGuards(AuthGuard('jwt'))
  @Post('job-video')
  @UseInterceptors(
    FilesInterceptor('videos', 5, {
      storage: memoryStorage(),
      fileFilter: videoFilter,
      limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB
    }),
  )
  async uploadJobVideos(
    @UploadedFiles() files: any[],
    @Req() req: any,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('En az 1 video yüklenmelidir');
    }
    const dir = join(process.cwd(), 'uploads', 'jobs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const ext = file.originalname.split('.').pop() || 'mp4';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const dest = join(dir, filename);
      fs.writeFileSync(dest, file.buffer);
      urls.push(
        `${req.protocol}://${req.get('host')}/uploads/jobs/${filename}`,
      );
    }
    return urls;
  }

  /** POST /uploads/portfolio  — Phase 43 worker portfolio fotoğrafı (tek) */
  @UseGuards(AuthGuard('jwt'))
  @Post('portfolio')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadPortfolioPhoto(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Fotoğraf seçilmedi');
    const fullName: string = String(req.user?.fullName || 'user');
    const folder = sanitizeName(fullName);
    const dir = join(process.cwd(), 'uploads', 'portfolio', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Phase 96: render JPEG/WebP/AVIF @ 1024/640/320 + legacy <name>.jpg
    await processImage(file.buffer, dir, baseName);
    return {
      url: `${req.protocol}://${req.get('host')}/uploads/portfolio/${folder}/${baseName}.jpg`,
    };
  }

  /** POST /uploads/portfolio-video — Phase 125 worker portfolio videosu (tek) */
  @UseGuards(AuthGuard('jwt'))
  @Post('portfolio-video')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      fileFilter: (req: any, file: any, cb: any) => {
        if (!file.mimetype.match(/^video\/(mp4|quicktime|webm)$/)) {
          return cb(
            new BadRequestException(
              'Sadece video dosyaları yüklenebilir (mp4, mov, webm)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadPortfolioVideo(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Video seçilmedi');
    const fullName: string = String(req.user?.fullName || 'user');
    const folder = sanitizeName(fullName);
    const dir = join(process.cwd(), 'uploads', 'portfolio-videos', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const extMap: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
    };
    const ext = extMap[file.mimetype] || 'mp4';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dest = join(dir, filename);
    fs.writeFileSync(dest, file.buffer);
    return {
      url: `${req.protocol}://${req.get('host')}/uploads/portfolio-videos/${folder}/${filename}`,
    };
  }

  /** POST /uploads/profile-photo — Phase 72: avatar (512×512 cover crop) */
  @UseGuards(AuthGuard('jwt'))
  @Post('profile-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadProfilePhoto(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Profil fotoğrafı seçilmedi');

    const fullName: string = String(req.user?.fullName || 'user');
    const folder = sanitizeName(fullName);
    const dir = join(process.cwd(), 'uploads', 'profile', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Cache-bust isim — Phase 96: 512/256/128 cover crop, 3 format
    const baseName = `profile-${Date.now()}`;
    await processImage(file.buffer, dir, baseName, {
      sizes: [512, 256, 128],
      cover: 512,
    });

    return {
      url: `${req.protocol}://${req.get('host')}/uploads/profile/${folder}/${baseName}.jpg`,
    };
  }

  /** POST /uploads/identity-photo  — kimlik fotoğrafı (zorunlu) */
  @UseGuards(AuthGuard('jwt'))
  @Post('identity-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadIdentityPhoto(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Kimlik fotoğrafı zorunludur');

    const fullName: string = String(req.user?.fullName || 'user');
    const folder = sanitizeName(fullName);
    const dir = join(process.cwd(), 'uploads', 'identity', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dest = join(dir, 'kimlik.jpg');
    await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(dest);

    return {
      url: `${req.protocol}://${req.get('host')}/uploads/identity/${folder}/kimlik.jpg`,
    };
  }

  /** POST /uploads/onboarding-image  — onboarding slide görseli (admin) */
  @UseGuards(AuthGuard('jwt'))
  @Post('onboarding-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadOnboardingImage(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Görsel seçilmedi');
    const dir = join(process.cwd(), 'uploads', 'onboarding');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Phase 96: 1200/800/400 + 3 formats
    await processImage(file.buffer, dir, baseName, {
      sizes: [1200, 800, 400],
      jpegQuality: 82,
    });
    return {
      url: `${req.protocol}://${req.get('host')}/uploads/onboarding/${baseName}.jpg`,
    };
  }

  /** POST /uploads/document  — belge fotoğrafı (opsiyonel) */
  @UseGuards(AuthGuard('jwt'))
  @Post('document')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: any,
    @Req() req: any,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Belge fotoğrafı seçilmedi');

    const fullName: string = String(req.user?.fullName || 'user');
    const folder = sanitizeName(fullName);
    const dir = join(process.cwd(), 'uploads', 'identity', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dest = join(dir, 'belge.jpg');
    await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(dest);

    return {
      url: `${req.protocol}://${req.get('host')}/uploads/identity/${folder}/belge.jpg`,
    };
  }
}
