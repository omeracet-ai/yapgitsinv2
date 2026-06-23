import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategorySearchService } from './category-search.service';
import { Job } from '../jobs/job.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Job, ServiceRequest])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategorySearchService],
  exports: [CategoriesService, CategorySearchService],
})
export class CategoriesModule {}
