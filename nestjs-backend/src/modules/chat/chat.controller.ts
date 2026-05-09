import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import type { TranslateLang } from '../ai/translate.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  /**
   * Phase 69: list conversations for the current user.
   * Each item: peer profile + last message + unread count.
   * Phase 78: includes peerOnline + peerLastSeenAt.
   */
  @Get('conversations')
  getConversations(@Request() req: AuthenticatedRequest) {
    return this.svc.getConversations(req.user.id);
  }

  /** Phase 78: presence query for a single user. */
  @Get('presence/:userId')
  getPresence(@Param('userId') userId: string) {
    return this.svc.getPresence(userId);
  }

  /**
   * Phase 153: translate a chat message to a target language.
   * Body: { targetLang: 'tr' | 'en' | 'az' }
   * Result is cached on the message row per language.
   */
  @Post('messages/:id/translate')
  translateMessage(
    @Param('id') id: string,
    @Body() body: { targetLang: TranslateLang },
    @Request() req: AuthenticatedRequest,
  ) {
    const lang = body?.targetLang;
    if (lang !== 'tr' && lang !== 'en' && lang !== 'az') {
      throw new BadRequestException(
        'targetLang tr|en|az olmalı',
      );
    }
    return this.svc.translateMessage(id, req.user.id, lang);
  }
}
