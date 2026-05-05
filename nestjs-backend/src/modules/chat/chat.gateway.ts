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
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { to: string; message: string; from: string },
    @ConnectedSocket() _client: Socket,
  ) {
    this.logger.debug(`Message event: from=${data.from} to=${data.to}`);
    await this.messagesRepo.save({
      from: data.from,
      to: data.to,
      message: data.message,
    });
    this.server.emit('receiveMessage', data);
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
    @MessageBody() data: { userId: string; peerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const messages = await this.messagesRepo
      .createQueryBuilder('m')
      .where(
        '(m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId)',
        { userId: data.userId, peerId: data.peerId },
      )
      .orderBy('m.createdAt', 'ASC')
      .take(100)
      .getMany();
    client.emit('chatHistory', messages);
  }
}
