import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User, ServiceRequest]),
    CategoriesModule,
    ProvidersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
