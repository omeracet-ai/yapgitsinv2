import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import { ModerationModule } from '../moderation/moderation.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, User]),
    ModerationModule,
    UserBlocksModule,
    AiModule,
    NotificationsModule,
    SystemSettingsModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
