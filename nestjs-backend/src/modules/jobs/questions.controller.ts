import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionsService } from './questions.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
import { stripHtml, stripHtmlOptional } from '../../common/utils/strip-html';

@Controller('jobs/:jobId/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  getQuestions(@Param('jobId') jobId: string) {
    return this.questionsService.getQuestions(jobId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  postQuestion(
    @Param('jobId') jobId: string,
    @Request() req: AuthenticatedRequest,
    @Body('text') text: string,
    @Body('photoUrl') photoUrl?: string,
  ) {
    // Phase 519 — free-text + photoUrl XSS strip.
    return this.questionsService.postQuestion(
      jobId,
      req.user.id,
      stripHtml(text),
      stripHtmlOptional(photoUrl),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':questionId/replies')
  postReply(
    @Param('questionId') questionId: string,
    @Request() req: AuthenticatedRequest,
    @Body('text') text: string,
  ) {
    // Phase 519 — free-text XSS strip.
    return this.questionsService.postReply(
      questionId,
      req.user.id,
      stripHtml(text),
    );
  }
}
