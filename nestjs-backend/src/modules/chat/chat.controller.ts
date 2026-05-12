import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService, SendMessageDto } from './chat.service';
import type { TranslateLang } from '../ai/translate.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  /**
   * Phase 162: send a message to another user.
   * Body: { to: string, message: string, jobLeadId?: string }
   */
  @Post()
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.sendMessage(req.user.id, dto);
  }

  /**
   * Phase 162: get message history with a specific peer.
   * Query: ?limit=50
   */
  @Get('history/:peerId')
  async getHistory(
    @Param('peerId') peerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.getMessageHistory(req.user.id, peerId);
  }

  /**
   * Phase 162: get all conversations for the current user.
   */
  @Get('conversations')
  async getConversations(@Request() req: AuthenticatedRequest) {
    return this.svc.getConversations(req.user.id);
  }

  /**
   * Phase 162: mark a message as read.
   * Body: { messageIds: string[] }
   */
  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.svc.markMessagesAsRead([id], req.user.id);
    return { success: true };
  }

  /**
   * Phase 162: mark multiple messages as read.
   * Body: { messageIds: string[] }
   */
  @Post('batch/read')
  async markManyAsRead(
    @Body() body: { messageIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    if (!body.messageIds || !Array.isArray(body.messageIds)) {
      throw new BadRequestException('messageIds array gereklidir');
    }
    await this.svc.markMessagesAsRead(body.messageIds, req.user.id);
    return { success: true, markedCount: body.messageIds.length };
  }

  /**
   * Phase 162: get total unread message count.
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.svc.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  /**
   * Phase 162: delete a message.
   */
  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.svc.deleteMessage(id, req.user.id);
    return { success: true };
  }

  /**
   * Phase 78: presence query for a single user.
   */
  @Get('presence/:userId')
  async getPresence(@Param('userId') userId: string) {
    return this.svc.getPresence(userId);
  }

  /**
   * Phase 153: translate a chat message to a target language.
   * Body: { targetLang: 'tr' | 'en' | 'az' }
   * Result is cached on the message row per language.
   */
  @Post(':id/translate')
  async translateMessage(
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
