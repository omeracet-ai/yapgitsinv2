import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from './chat-message.entity';
import { ModerationModule } from '../moderation/moderation.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    ModerationModule,
    UserBlocksModule,
  ],
  providers: [ChatGateway],
})
export class ChatModule {}
