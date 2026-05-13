import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';
import { AdminAuditService } from './admin-audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { User } from '../users/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog, User])],
  providers: [AdminAuditService, AuditInterceptor],
  exports: [AdminAuditService, AuditInterceptor],
})
export class AdminAuditModule {}
