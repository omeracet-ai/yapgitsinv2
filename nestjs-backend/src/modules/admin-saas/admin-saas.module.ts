import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AiModule } from '../ai/ai.module';

import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Booking } from '../bookings/booking.entity';
import { Category } from '../categories/category.entity';
import { Review } from '../reviews/review.entity';
import { Notification } from '../notifications/notification.entity';

// SaaS entities
import { AdminChatMessage } from './entities/admin-chat-message.entity';
import { NotFoundLog } from './entities/not-found-log.entity';
import { Redirect } from './entities/redirect.entity';
import { GscCache } from './entities/gsc-cache.entity';
import { MessageLog } from './entities/message-log.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';

// Controllers
import { CronHubController } from './controllers/cron-hub.controller';
import { QualityCheckController } from './controllers/quality-check.controller';
import { AdminAiAssistantController } from './controllers/admin-ai-assistant.controller';
import { DnsHealthController } from './controllers/dns-health.controller';
import { NotFoundMonitorController } from './controllers/not-found-monitor.controller';
import { MessageLogController } from './controllers/message-log.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { GscController } from './controllers/gsc.controller';
import { KeywordFinderController } from './controllers/keyword-finder.controller';
import { PillarsController } from './controllers/pillars.controller';
import { RbacController } from './controllers/rbac.controller';

// Services
import { QualityCheckService } from './services/quality-check.service';
import { AdminAiAssistantService } from './services/admin-ai-assistant.service';
import { DnsHealthService } from './services/dns-health.service';
import { MessageLogService } from './services/message-log.service';
import { LoyaltyAdminService } from './services/loyalty.service';
import { GscService } from './services/gsc.service';

import { PillarPage } from './entities/pillar-page.entity';
import { BlogDraft } from './entities/blog-draft.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    AdminAuditModule,
    AiModule,
    TypeOrmModule.forFeature([
      // base entities reused
      User,
      Job,
      Offer,
      ServiceRequest,
      Booking,
      Category,
      Review,
      Notification,
      // saas entities
      AdminChatMessage,
      NotFoundLog,
      Redirect,
      GscCache,
      MessageLog,
      LoyaltyTransaction,
      PillarPage,
      BlogDraft,
    ]),
  ],
  controllers: [
    CronHubController,
    QualityCheckController,
    AdminAiAssistantController,
    DnsHealthController,
    NotFoundMonitorController,
    MessageLogController,
    LoyaltyController,
    GscController,
    KeywordFinderController,
    PillarsController,
    RbacController,
  ],
  providers: [
    QualityCheckService,
    AdminAiAssistantService,
    DnsHealthService,
    MessageLogService,
    LoyaltyAdminService,
    GscService,
  ],
  exports: [MessageLogService, LoyaltyAdminService],
})
export class AdminSaasModule {}
