import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { AuthUser } from '../../common/types/auth.types';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AppConfigService } from './app-config.service';
import { AppConfigGateway } from './app-config.gateway';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/create-theme.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { ReplaceLayoutDto } from './dto/replace-layout.dto';
import { UpsertVisibilityDto } from './dto/upsert-visibility.dto';
import { CreateScreenDto, UpdateScreenDto } from './dto/upsert-screen.dto';

@SkipThrottle({
  short: true,
  medium: true,
  long: true,
  default: true,
})
@Controller('admin/app-config')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@RequirePermission('apk-builder')
export class AppConfigAdminController {
  constructor(
    private readonly service: AppConfigService,
    private readonly audit: AdminAuditService,
    private readonly gateway: AppConfigGateway,
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

  // ── History / Rollback (Voldi-fs Utility 1) ──────────────────────
  /**
   * Recent app-config audit history filtered by entity type, optionally
   * narrowed to a specific entity id. Returns at most `limit` rows (default 20,
   * max 100), newest first.
   */
  @Get('history')
  history(
    @Query('type') type?: string,
    @Query('id') id?: string,
    @Query('limit') limit?: string,
  ) {
    const t = (type ?? '').trim();
    if (!t) return [];
    const lim = limit ? Number(limit) : 20;
    return this.service.getHistory(t, id || undefined, lim);
  }

  @Post('rollback/:auditLogId')
  async rollback(
    @Param('auditLogId') auditLogId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const adminId = req.user?.id ?? '';
    const out = await this.service.rollback(auditLogId, adminId);
    await this.audit.record({
      actor: this.actor(req),
      action: `app-config.${out.entityType}.rollback`,
      targetType: 'app_config',
      targetId: auditLogId,
      payload: { sourceAuditLogId: auditLogId },
      req,
    });
    this.gateway.pushUpdate({ type: `${out.entityType}.rollback` });
    return out;
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
    this.gateway.pushUpdate({ type: 'setting' });
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
    this.gateway.pushUpdate({ type: 'setting' });
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
    this.gateway.pushUpdate({ type: 'theme' });
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
    this.gateway.pushUpdate({ type: 'theme' });
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
    this.gateway.pushUpdate({ type: 'theme' });
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
    this.gateway.pushUpdate({ type: 'branding' });
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
    this.gateway.pushUpdate({ type: 'layout' });
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
    this.gateway.pushUpdate({ type: 'visibility' });
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
    this.gateway.pushUpdate({ type: 'visibility' });
    return out;
  }

  // ── Screens (Phase 276 — All-Pages Registry) ─────────────
  @Get('screens')
  listScreens() {
    return this.service.listScreens();
  }

  @Post('screen')
  async createScreen(
    @Body() dto: CreateScreenDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.createScreen(dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.screen.create',
      targetType: 'app_screen',
      targetId: dto.key,
      payload: dto as unknown as Record<string, unknown>,
      req,
    });
    this.gateway.pushUpdate({ type: 'screen' });
    return out;
  }

  @Patch('screen/:key')
  async updateScreen(
    @Param('key') key: string,
    @Body() dto: UpdateScreenDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.updateScreen(key, dto);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.screen.update',
      targetType: 'app_screen',
      targetId: key,
      payload: dto as unknown as Record<string, unknown>,
      req,
    });
    this.gateway.pushUpdate({ type: 'screen' });
    return out;
  }

  @Delete('screen/:key')
  async deleteScreen(
    @Param('key') key: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const out = await this.service.deleteScreen(key);
    await this.audit.record({
      actor: this.actor(req),
      action: 'app-config.screen.delete',
      targetType: 'app_screen',
      targetId: key,
      req,
    });
    this.gateway.pushUpdate({ type: 'screen' });
    return out;
  }
}
