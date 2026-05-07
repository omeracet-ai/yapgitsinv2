import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Offer])],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
