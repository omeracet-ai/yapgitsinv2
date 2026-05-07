import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobTemplate } from './job-template.entity';
import { JobTemplatesService } from './job-templates.service';
import { JobTemplatesController } from './job-templates.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobTemplate]), JobsModule],
  providers: [JobTemplatesService],
  controllers: [JobTemplatesController],
  exports: [JobTemplatesService],
})
export class JobTemplatesModule {}
