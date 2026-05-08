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
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobDispute, Dispute, User]),
    EscrowModule,
    NotificationsModule,
  ],
  controllers: [
    AdminDisputesController,
    DisputesController,
    AdminGeneralDisputesController,
    GeneralDisputesController,
  ],
  providers: [DisputesService, GeneralDisputesService],
  exports: [DisputesService, GeneralDisputesService],
})
export class DisputesModule {}
