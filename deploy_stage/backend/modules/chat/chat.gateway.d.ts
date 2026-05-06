import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './chat-message.entity';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private messagesRepo;
    server: Server;
    private readonly logger;
    constructor(messagesRepo: Repository<ChatMessage>);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(data: {
        to: string;
        message: string;
        from: string;
    }, _client: Socket): Promise<void>;
    handleJoinRoom(roomId: string, client: Socket): void;
    handleGetHistory(data: {
        userId: string;
        peerId: string;
    }, client: Socket): Promise<void>;
}
