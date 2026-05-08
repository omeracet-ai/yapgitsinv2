import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boost } from './boost.entity';
import { User } from '../users/user.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { BoostService } from './boost.service';
import { BoostController } from './boost.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Boost, User, TokenTransaction])],
  providers: [BoostService],
  controllers: [BoostController],
  exports: [BoostService],
})
export class BoostModule {}
