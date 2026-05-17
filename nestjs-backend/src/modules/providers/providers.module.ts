import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './provider.entity';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, User, Job, Offer])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
