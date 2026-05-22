import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobDispute } from './job-dispute.entity';
import { Dispute } from './dispute.entity';
import { DisputesService } from './disputes.service';
import { GeneralDisputesService } from './general-disputes.service';
import {
  AdminDisputesController,
  DisputesController,
} from './disputes.controller';
import {
  AdminGeneralDisputesController,
  GeneralDisputesController,
} from './general-disputes.controller';
import { EscrowModule } from '../escrow/escrow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobDispute, Dispute, User]),
    EscrowModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [
    // Statik-route controller'lar ('mine' / 'list') greedy ':id' controller'larından
    // ÖNCE kayıtlı olmalı; aksi halde GET /disputes/mine → DisputesController @Get(':id')
    // tarafından (id="mine") yakalanıp "Dispute not found" fırlatıyordu.
    AdminGeneralDisputesController,
    AdminDisputesController,
    GeneralDisputesController,
    DisputesController,
  ],
  providers: [DisputesService, GeneralDisputesService],
  exports: [DisputesService, GeneralDisputesService],
})
export class DisputesModule {}
