import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobDispute } from './job-dispute.entity';
import { DisputesService } from './disputes.service';
import {
  AdminDisputesController,
  DisputesController,
} from './disputes.controller';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobDispute]), EscrowModule],
  controllers: [AdminDisputesController, DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
