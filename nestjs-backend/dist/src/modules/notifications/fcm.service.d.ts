import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
export declare class FcmService implements OnModuleInit {
    private usersRepo;
    private readonly logger;
    private admin;
    private enabled;
    constructor(usersRepo: Repository<User>);
    onModuleInit(): Promise<void>;
    isEnabled(): boolean;
    sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean>;
    sendToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<{
        successCount: number;
        failureCount: number;
    }>;
    private cleanupTokens;
    sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
    broadcastToAll(title: string, body: string, data?: Record<string, string>): Promise<number>;
}
