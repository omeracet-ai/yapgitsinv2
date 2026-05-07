import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlock } from './user-block.entity';
import { UserReport } from './user-report.entity';
import { User } from '../users/user.entity';
import { UserBlocksService } from './user-blocks.service';
import { UserBlocksController } from './user-blocks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock, UserReport, User])],
  providers: [UserBlocksService],
  controllers: [UserBlocksController],
  exports: [UserBlocksService],
})
export class UserBlocksModule {}
