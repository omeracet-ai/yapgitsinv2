import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

interface RequestWithTenant extends Request {
  tenant?: Tenant;
}

@ApiTags('Tenants')
@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('tenants/current')
  async current(@Req() req: RequestWithTenant) {
    const t = req.tenant ?? (await this.tenants.getDefault());
    if (!t) return null;
    return {
      id: t.id,
      slug: t.slug,
      brandName: t.brandName,
      theme: t.theme,
      defaultCurrency: t.defaultCurrency,
      defaultLocale: t.defaultLocale,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @Get('super-admin/tenants')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard)
  async list() {
    return this.tenants.list();
  }

  @ApiBearerAuth('JWT-auth')
  @Post('super-admin/tenants')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard)
  async create(@Body() body: Partial<Tenant>) {
    return this.tenants.create(body);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('super-admin/tenants/:id')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard)
  async update(@Param('id') id: string, @Body() body: Partial<Tenant>) {
    return this.tenants.update(id, body);
  }
}
