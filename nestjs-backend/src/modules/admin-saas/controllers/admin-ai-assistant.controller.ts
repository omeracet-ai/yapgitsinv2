import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { AdminAiAssistantService } from '../services/admin-ai-assistant.service';
import type { AuthUser } from '../../../common/types/auth.types';

/**
 * M1 — AI Operations Assistant.
 * Mode-based admin AI chat, backed by Gemini 2.5 Flash via GeminiClient.
 */
@Controller('admin/ai-assistant')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminAiAssistantController {
  constructor(private readonly svc: AdminAiAssistantService) {}

  @Get('modes')
  modes() {
    return { modes: this.svc.getModes() };
  }

  @Post('chat')
  chat(
    @Body() body: { sessionId?: string; mode?: string; message: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.svc.chat({
      sessionId: body.sessionId,
      mode: body.mode,
      message: body.message,
      adminId: req.user?.id ?? null,
    });
  }

  @Get('sessions')
  listSessions(@Query('limit') limit?: string) {
    const n = Math.min(100, Math.max(1, Number(limit ?? 30)));
    return this.svc.listSessions(n);
  }

  @Get('sessions/:id')
  session(@Param('id') id: string) {
    return this.svc.getSession(id);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string) {
    return this.svc.deleteSession(id);
  }
}
