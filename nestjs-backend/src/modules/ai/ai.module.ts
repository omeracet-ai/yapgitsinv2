import { Module } from '@nestjs/common';
import { AiController, AiPublicController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController, AiPublicController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
