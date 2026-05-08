import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantMiddleware } from '../../common/tenant.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
