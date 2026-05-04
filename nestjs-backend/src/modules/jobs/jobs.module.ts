import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Offer } from './offer.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { OffersService } from './offers.service';
import { OffersController, OffersRootController } from './offers.controller';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Offer]), UsersModule, TokensModule],
  providers: [JobsService, OffersService],
  controllers: [JobsController, OffersController, OffersRootController],
  exports: [JobsService, OffersService],
})
export class JobsModule {}
