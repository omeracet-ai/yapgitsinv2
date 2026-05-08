import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { FavoriteWorker } from './favorite-worker.entity';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { UsersController } from './users.controller';
import { Job } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { EarningsService } from './earnings.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, FavoriteWorker, Job, Review, Offer, Booking])],
  controllers: [UsersController],
  providers: [UsersService, FavoriteWorkersService, EarningsService],
  exports: [UsersService],
})
export class UsersModule {}
