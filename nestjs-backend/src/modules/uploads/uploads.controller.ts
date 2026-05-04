import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

function sanitizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9À-ž\-]/g, '')
    .substring(0, 60) || 'user';
}

const imageFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
    return cb(new BadRequestException('Sadece resim dosyaları yüklenebilir'), false);
  }
  cb(null, true);
};

@Controller('uploads')
export class UploadsController {

  /** POST /uploads/job-photos  — iş ilanı fotoğrafları (max 3) */
  @UseGuards(AuthGuard('jwt'))
  @Post('job-photos')
  @UseInterceptors(
    FilesInterceptor('photos', 3, {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadJobPhotos(@UploadedFiles() files: any[], @Req() req: any): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('En az 1 fotoğraf yüklenmelidir');
    }
    const dir = join(process.cwd(), 'uploads', 'jobs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const dest = join(dir, filename);
      await sharp(file.buffer)
        .resize({ width: 1024, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(dest);
      urls.push(`${req.protocol}://${req.get('host')}/uploads/jobs/${filename}`);
    }
    return urls;
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
  async uploadIdentityPhoto(@UploadedFile() file: any, @Req() req: any): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Kimlik fotoğrafı zorunludur');

    const fullName = req.user?.fullName || 'user';
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
  async uploadDocument(@UploadedFile() file: any, @Req() req: any): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('Belge fotoğrafı seçilmedi');

    const fullName = req.user?.fullName || 'user';
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
