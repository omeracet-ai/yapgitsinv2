import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSetting } from './platform-setting.entity';
import { PlatformSettingsService } from './platform-settings.service';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting, AdminAuditLog])],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
