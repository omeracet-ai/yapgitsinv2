import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  /**
   * Phase 69: list conversations for the current user.
   * Each item: peer profile + last message + unread count.
   */
  @Get('conversations')
  getConversations(@Request() req: AuthenticatedRequest) {
    return this.svc.getConversations(req.user.id);
  }
}
