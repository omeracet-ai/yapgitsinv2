import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { ReplyReviewDto } from './dto/reply-review.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() data: Record<string, unknown>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.create({ ...data, reviewerId: req.user.id });
  }

  @Get('user/:id')
  async findByReviewee(@Param('id') id: string) {
    return this.reviewsService.findByReviewee(id);
  }

  @Get('job/:jobId')
  async findByJob(@Param('jobId') jobId: string) {
    return this.reviewsService.findByJob(jobId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/reply')
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.addOrUpdateReply(id, req.user.id, dto.text);
  }

  /** Phase 212: review'a fotoğraf ekle (multipart, max 3) */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 3))
  async addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    // URL'leri body'den de kabul et (multipart olmayan istemciler için)
    const photoUrls = (files || []).map(
      (f) => `/uploads/${f.filename || f.originalname}`,
    );
    return this.reviewsService.addPhotos(id, req.user.id, photoUrls);
  }

  /** Phase 212: "faydalı" oyu */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/helpful')
  async markHelpful(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.markHelpful(id, req.user.id);
  }

  /** Phase 212: worker'a ait yorumlar (photos + helpfulCount dahil) */
  @Get('worker/:workerId')
  async findByWorker(@Param('workerId') workerId: string) {
    return this.reviewsService.findByReviewee(workerId);
  }
}
