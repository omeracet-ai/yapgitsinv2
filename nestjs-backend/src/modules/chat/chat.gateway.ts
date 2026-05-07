import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './chat-message.entity';
import { ContentFilterService } from '../moderation/content-filter.service';
import { UserBlocksService } from '../user-blocks/user-blocks.service';

interface SendMessagePayload {
  from: string;
  to: string;
  message: string;
  jobId?: string | null;
  bookingId?: string | null;
}

interface GetHistoryPayload {
  userId: string;
  peerId?: string;
  jobId?: string;
  bookingId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @InjectRepository(ChatMessage)
    private messagesRepo: Repository<ChatMessage>,
    private filter: ContentFilterService,
    private userBlocksService: UserBlocksService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: SendMessagePayload,
    @ConnectedSocket() _client: Socket,
  ) {
    this.logger.debug(
      `Message event: from=${data.from} to=${data.to} jobId=${data.jobId ?? '-'} bookingId=${data.bookingId ?? '-'}`,
    );
    if (data.from && data.to) {
      const blocked = await this.userBlocksService.isEitherBlocked(
        data.from,
        data.to,
      );
      if (blocked) {
        _client.emit('error', {
          type: 'blocked',
          message: 'Bu kullanıcıyla mesajlaşma engellendi',
        });
        return;
      }
    }
    const result = this.filter.check(data.message);
    const saved = await this.messagesRepo.save({
      from: data.from,
      to: data.to,
      message: data.message,
      jobId: data.jobId ?? null,
      bookingId: data.bookingId ?? null,
      flagged: result.flagged,
      flagReason: result.flagged ? result.reasons.join(',') : null,
    });
    const broadcastMessage = result.flagged
      ? this.filter.sanitize(data.message)
      : data.message;
    this.server.emit('receiveMessage', {
      ...data,
      message: broadcastMessage,
      jobId: saved.jobId,
      bookingId: saved.bookingId,
      id: saved.id,
      flagged: saved.flagged,
      createdAt: saved.createdAt,
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(roomId);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody() data: GetHistoryPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const qb = this.messagesRepo.createQueryBuilder('m');

    // Context filters take precedence; both can be combined with peer filter.
    if (data.jobId) {
      qb.andWhere('m.jobId = :jobId', { jobId: data.jobId });
    }
    if (data.bookingId) {
      qb.andWhere('m.bookingId = :bookingId', { bookingId: data.bookingId });
    }

    if (data.peerId) {
      // Restrict to the conversation between userId and peerId.
      qb.andWhere(
        '((m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId))',
        { userId: data.userId, peerId: data.peerId },
      );
    } else if (!data.jobId && !data.bookingId) {
      // No filter at all — fall back to messages involving userId.
      qb.andWhere('(m.from = :userId OR m.to = :userId)', {
        userId: data.userId,
      });
    }

    // Newest 100, returned in chronological order for UI.
    const messages = await qb
      .orderBy('m.createdAt', 'DESC')
      .take(100)
      .getMany();
    messages.reverse();

    client.emit('chatHistory', messages);
  }
}
