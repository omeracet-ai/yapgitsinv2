import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
}
