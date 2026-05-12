import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadRequest } from './lead-request.entity';
import { JobLead } from './job-lead.entity';
import { JobLeadResponse } from './job-lead-response.entity';
import { LeadsService } from './leads.service';
import { JobLeadsService } from './job-leads.service';
import { LeadsController } from './leads.controller';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeadRequest, JobLead, JobLeadResponse, User])],
  controllers: [LeadsController],
  providers: [LeadsService, JobLeadsService],
  exports: [LeadsService, JobLeadsService],
})
export class LeadsModule {}
