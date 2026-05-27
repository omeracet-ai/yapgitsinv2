import {
  CacheInterceptor,
  CacheTTL,
} from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AppConfigService, PublicAppConfig } from './app-config.service';

@Controller('app-config')
@UseInterceptors(CacheInterceptor)
export class AppConfigController {
  constructor(private readonly service: AppConfigService) {}

  @Get()
  @CacheTTL(60_000)
  get(): Promise<PublicAppConfig> {
    return this.service.getPublicConfig();
  }
}
