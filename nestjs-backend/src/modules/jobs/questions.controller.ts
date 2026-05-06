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
    return this.questionsService.postQuestion(jobId, req.user.id, text, photoUrl);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':questionId/replies')
  postReply(
    @Param('questionId') questionId: string,
    @Request() req: AuthenticatedRequest,
    @Body('text') text: string,
  ) {
    return this.questionsService.postReply(questionId, req.user.id, text);
  }
}
