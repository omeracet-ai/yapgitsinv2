import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthUser } from '../../common/types/auth.types';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AppConfigService } from './app-config.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/create-theme.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { ReplaceLayoutDto } from './dto/replace-layout.dto';
import { UpsertVisibilityDto } from './dto/upsert-visibility.dto';

@SkipThrottle({
  short: true,
  medium: true,
  long: true,
  default: true,
})
@Controller('admin/app-config')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AppConfigAdminController {
  constructor(
    private readonly service: AppConfigService,
    private readonly audit: AdminAuditService,
  ) {}

  private actor(req: Request & { user?: AuthUser }) {
    return { id: req.user?.id ?? '', email: req.user?.email ?? null };
  }

  @Get()
  getAll() {
    return this.service.getPublicConfig();
  }

  @Get('themes')
  listThemes() {
    return this.service.listThemes();
  }

  // ── Settings ─────────────────────────────────────────────
  @Patch('setting')
  async upsertSetting(
    @Body() dto: UpsertSettingDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.upsertSetting(dto, req.user?.id ?? '');
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.setting.upsert',
      targetType: 'app_setting',
      targetId: dto.key,
      payload: { key: dto.key, type: dto.type, group: dto.group },
      req,
    });
    return out;
  }

  @Delete('setting/:key')
  async deleteSetting(
    @Param('key') key: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.deleteSetting(key);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.setting.delete',
      targetType: 'app_setting',
      targetId: key,
      req,
    });
    return out;
  }

  // ── Themes ───────────────────────────────────────────────
  @Post('theme')
  async createTheme(
    @Body() dto: CreateThemeDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.createTheme(dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.theme.create',
      targetType: 'app_theme',
      targetId: out.id,
      payload: { name: dto.name, isActive: !!dto.isActive },
      req,
    });
    return out;
  }

  @Patch('theme/:id')
  async updateTheme(
    @Param('id') id: string,
    @Body() dto: UpdateThemeDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.updateTheme(id, dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.theme.update',
      targetType: 'app_theme',
      targetId: id,
      payload: { isActive: dto.isActive },
      req,
    });
    return out;
  }

  @Delete('theme/:id')
  async deleteTheme(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.deleteTheme(id);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.theme.delete',
      targetType: 'app_theme',
      targetId: id,
      req,
    });
    return out;
  }

  // ── Branding ─────────────────────────────────────────────
  @Patch('branding')
  async updateBranding(
    @Body() dto: UpdateBrandingDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.updateBranding(dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.branding.update',
      targetType: 'app_branding',
      targetId: 'default',
      payload: dto as unknown as Record<string, unknown>,
      req,
    });
    return out;
  }

  // ── Layouts ──────────────────────────────────────────────
  @Put('layout')
  async replaceLayout(
    @Body() dto: ReplaceLayoutDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.replaceLayout(dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.layout.replace',
      targetType: 'app_layout',
      targetId: dto.screen,
      payload: { screen: dto.screen, itemCount: dto.items.length },
      req,
    });
    return out;
  }

  // ── Visibility ───────────────────────────────────────────
  @Patch('visibility/:moduleKey')
  async upsertVisibility(
    @Param('moduleKey') moduleKey: string,
    @Body() dto: UpsertVisibilityDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.upsertVisibility(moduleKey, dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.visibility.upsert',
      targetType: 'app_visibility',
      targetId: moduleKey,
      payload: dto as unknown as Record<string, unknown>,
      req,
    });
    return out;
  }

  @Delete('visibility/:moduleKey')
  async deleteVisibility(
    @Param('moduleKey') moduleKey: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.deleteVisibility(moduleKey);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.visibility.delete',
      targetType: 'app_visibility',
      targetId: moduleKey,
      req,
    });
    return out;
  }
}
