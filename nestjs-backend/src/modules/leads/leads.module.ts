import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadRequest } from './lead-request.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeadRequest])],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
