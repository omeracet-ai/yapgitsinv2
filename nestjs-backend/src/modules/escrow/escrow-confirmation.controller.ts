import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { join } from 'path';
import * as fs from 'fs';
import { APP_ROOT } from '../../common/paths';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { EscrowConfirmationService } from './escrow-confirmation.service';

class StartDto {
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
}

class ScanDto {
  // QR token: payload(escrowId|issuedAt|nonce) + HMAC(24), base64url encoded.
  // ~123 char tipik. 256 ile geniş tampon — DoS koruması korunuyor.
  @IsString() @MaxLength(256) qrToken!: string;
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
}

class PhotoMetaDto {
  @IsIn(['before', 'after']) phase!: 'before' | 'after';
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() takenAt?: string;
}

class VideoMetaDto {
  @IsOptional() @IsNumber() @Min(5) @Max(120) durationSec?: number;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class ConfirmDto {
  @IsOptional() @IsString() @MaxLength(200) signature?: string;
}

const imageFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/)) {
    return cb(new BadRequestException('Only jpeg/png allowed'), false);
  }
  cb(null, true);
};

const videoFilter = (req: any, file: any, cb: any) => {
  if (!file.mimetype.match(/^video\/(mp4|webm)$/)) {
    return cb(new BadRequestException('Only mp4/webm allowed'), false);
  }
  cb(null, true);
};

function publicBase(req: any): string {
  return (
    process.env.PUBLIC_API_URL ||
    `${req.protocol}://${req.get('host')}`
  );
}

@Controller('escrow/:id/confirmation')
@UseGuards(AuthGuard('jwt'))
export class EscrowConfirmationController {
  constructor(private readonly svc: EscrowConfirmationService) {}

  @Post('start')
  start(
    @Param('id') id: string,
    @Body() dto: StartDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.start(id, req.user.id, dto.lat, dto.lng);
  }

  @Get('qr')
  qr(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.getQr(id, req.user.id);
  }

  @Get('state')
  state(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.svc.getState(id, req.user.id);
  }

  @Post('scan')
  scan(
    @Param('id') id: string,
    @Body() dto: ScanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.scan(id, req.user.id, dto.qrToken, dto.lat, dto.lng);
  }

  @Post('photos')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req: AuthenticatedRequest & { protocol: string; get: any },
  ) {
    if (!file) throw new BadRequestException('Photo missing');
    const phase = body?.phase;
    if (phase !== 'before' && phase !== 'after') {
      throw new BadRequestException('phase must be before|after');
    }
    const lat = body?.lat != null ? Number(body.lat) : null;
    const lng = body?.lng != null ? Number(body.lng) : null;
    const takenAtRaw = body?.takenAt;
    const takenAt = takenAtRaw ? new Date(takenAtRaw) : null;

    const dir = join(APP_ROOT, 'uploads', 'escrow-confirmation', id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `photo-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    fs.writeFileSync(join(dir, filename), file.buffer);
    const photoUrl = `${publicBase(req)}/uploads/escrow-confirmation/${id}/${filename}`;

    const row = await this.svc.addPhoto({
      escrowId: id,
      userId: req.user.id,
      phase,
      photoUrl,
      lat,
      lng,
      takenAt,
    });
    return {
      id: row.id,
      url: row.photoUrl,
      phase: row.phase,
      side: row.side,
    };
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      fileFilter: videoFilter,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req: AuthenticatedRequest & { protocol: string; get: any },
  ) {
    if (!file) throw new BadRequestException('Video missing');
    const durationSec =
      body?.durationSec != null ? Number(body.durationSec) : null;
    if (durationSec != null && (durationSec < 5 || durationSec > 120)) {
      throw new BadRequestException('durationSec must be 5-120');
    }
    const lat = body?.lat != null ? Number(body.lat) : null;
    const lng = body?.lng != null ? Number(body.lng) : null;

    const dir = join(APP_ROOT, 'uploads', 'escrow-confirmation', id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = file.mimetype === 'video/webm' ? 'webm' : 'mp4';
    const filename = `video-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    fs.writeFileSync(join(dir, filename), file.buffer);
    const videoUrl = `${publicBase(req)}/uploads/escrow-confirmation/${id}/${filename}`;

    const row = await this.svc.addVideo({
      escrowId: id,
      userId: req.user.id,
      videoUrl,
      durationSec,
      lat,
      lng,
    });
    return { id: row.id, url: row.videoUrl, durationSec: row.durationSec };
  }

  @Post('confirm')
  confirm(
    @Param('id') id: string,
    @Body() _dto: ConfirmDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.confirm(id, req.user.id);
  }
}
