import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { AppTheme } from './entities/app-theme.entity';
import { AppBranding } from './entities/app-branding.entity';
import { AppLayout } from './entities/app-layout.entity';
import { AppVisibilityRule } from './entities/app-visibility-rule.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { AppConfigAdminController } from './app-config-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppSetting,
      AppTheme,
      AppBranding,
      AppLayout,
      AppVisibilityRule,
      AdminAuditLog,
    ]),
    AdminAuditModule,
  ],
  controllers: [AppConfigController, AppConfigAdminController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
