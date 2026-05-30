import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { AppSetting } from './entities/app-setting.entity';
import { AppTheme } from './entities/app-theme.entity';
import { AppBranding } from './entities/app-branding.entity';
import { AppLayout } from './entities/app-layout.entity';
import { AppVisibilityRule } from './entities/app-visibility-rule.entity';
import { AppScreen } from './entities/app-screen.entity';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { CreateThemeDto, UpdateThemeDto } from './dto/create-theme.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { ReplaceLayoutDto } from './dto/replace-layout.dto';
import { UpsertVisibilityDto } from './dto/upsert-visibility.dto';
import { CreateScreenDto, UpdateScreenDto } from './dto/upsert-screen.dto';

export interface PublicAppConfig {
  settings: Record<string, unknown>;
  theme: Record<string, unknown> | null;
  branding: {
    logoUrl: string | null;
    iconUrl: string | null;
    splashUrl: string | null;
    appTitle: string | null;
  } | null;
  layouts: Array<{
    screen: string;
    componentKey: string;
    sortOrder: number;
    visible: boolean;
    props: Record<string, unknown> | null;
  }>;
  visibility: Array<{
    moduleKey: string;
    active: boolean;
    roles: string[] | null;
    devices: string[] | null;
    activeFrom: string | null;
    activeUntil: string | null;
  }>;
  screens: Array<{
    key: string;
    visible: boolean;
    sortOrder: number;
  }>;
}

/**
 * Phase 276 — Known Flutter screens. Seeded once on first boot if the
 * `app_screens` table is empty; missing rows are added on each boot so we can
 * grow the registry without manual DB edits. `visible: true` keeps existing
 * routes reachable until an admin explicitly disables them.
 */
const KNOWN_SCREENS: Array<{
  key: string;
  name: string;
  iconName: string;
  category: string;
  sortOrder?: number;
}> = [
  { key: 'home', name: 'Yaptır (Ana)', iconName: 'home', category: 'main_nav', sortOrder: 0 },
  { key: 'yapgitsin', name: 'Yapgitsin (Keşfet)', iconName: 'search', category: 'main_nav', sortOrder: 1 },
  { key: 'harita', name: 'Harita', iconName: 'map', category: 'main_nav', sortOrder: 2 },
  { key: 'iserim', name: 'İşlerim', iconName: 'work', category: 'main_nav', sortOrder: 3 },
  { key: 'profil', name: 'Profil', iconName: 'person', category: 'main_nav', sortOrder: 4 },
  { key: 'login', name: 'Giriş Yap', iconName: 'login', category: 'auth' },
  { key: 'register', name: 'Kayıt Ol', iconName: 'person_add', category: 'auth' },
  { key: '2fa', name: '2FA Doğrulama', iconName: 'security', category: 'auth' },
  { key: 'forgot_password', name: 'Şifremi Unuttum', iconName: 'lock_reset', category: 'auth' },
  { key: 'post_job', name: 'İlan Ver', iconName: 'add_circle', category: 'job' },
  { key: 'job_detail', name: 'İlan Detayı', iconName: 'description', category: 'job' },
  { key: 'service_request', name: 'Hizmet Talepleri', iconName: 'support_agent', category: 'job' },
  { key: 'service_request_detail', name: 'Talep Detayı', iconName: 'fact_check', category: 'job' },
  { key: 'public_profile', name: 'Usta Profili', iconName: 'badge', category: 'profile' },
  { key: 'edit_profile', name: 'Profil Düzenle', iconName: 'edit', category: 'profile' },
  { key: 'portfolio', name: 'Portfolyo', iconName: 'photo_library', category: 'profile' },
  { key: 'chat', name: 'Sohbet', iconName: 'chat', category: 'communication' },
  { key: 'notifications', name: 'Bildirimler', iconName: 'notifications', category: 'communication' },
  { key: 'notification_settings', name: 'Bildirim Ayarları', iconName: 'tune', category: 'settings' },
  { key: 'tokens', name: 'Token Bakiyem', iconName: 'monetization_on', category: 'wallet' },
  { key: 'iban_settings', name: 'IBAN', iconName: 'account_balance', category: 'wallet' },
  { key: 'withdrawal', name: 'Para Çek', iconName: 'payments', category: 'wallet' },
  { key: 'crypto_deposit', name: 'Kripto Yatır', iconName: 'currency_bitcoin', category: 'wallet' },
  { key: 'bookings', name: 'Randevular', iconName: 'event', category: 'booking' },
  { key: 'booking_create', name: 'Randevu Oluştur', iconName: 'event_available', category: 'booking' },
  { key: 'calendar', name: 'Takvim', iconName: 'calendar_month', category: 'booking' },
  { key: 'escrow_list', name: 'Garantili Ödemeler', iconName: 'verified_user', category: 'escrow' },
  { key: 'escrow_confirmation', name: 'Onay Akışı', iconName: 'task_alt', category: 'escrow' },
  { key: 'reviews', name: 'Yorumlarım', iconName: 'rate_review', category: 'community' },
  { key: 'favorites', name: 'Favoriler', iconName: 'favorite', category: 'community' },
  { key: 'saved_jobs', name: 'Kaydedilen İşler', iconName: 'bookmark', category: 'community' },
  { key: 'blocked', name: 'Engellenenler', iconName: 'block', category: 'community' },
  { key: 'templates', name: 'Şablonlarım', iconName: 'inventory', category: 'tools' },
  { key: 'message_templates', name: 'Mesaj Şablonları', iconName: 'mail_outline', category: 'tools' },
  { key: 'certifications', name: 'Sertifikalarım', iconName: 'school', category: 'tools' },
  { key: 'reports', name: 'Şikayetlerim', iconName: 'report', category: 'community' },
];

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
    @InjectRepository(AppTheme)
    private readonly themeRepo: Repository<AppTheme>,
    @InjectRepository(AppBranding)
    private readonly brandingRepo: Repository<AppBranding>,
    @InjectRepository(AppLayout)
    private readonly layoutRepo: Repository<AppLayout>,
    @InjectRepository(AppVisibilityRule)
    private readonly visibilityRepo: Repository<AppVisibilityRule>,
    @InjectRepository(AppScreen)
    private readonly screenRepo: Repository<AppScreen>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async onModuleInit(): Promise<void> {
    const seeders: Array<{ name: string; fn: () => Promise<void> }> = [
      { name: 'seedScreens', fn: () => this.seedScreens() },
      { name: 'seedTheme', fn: () => this.seedTheme() },
      { name: 'seedBranding', fn: () => this.seedBranding() },
      { name: 'seedSettings', fn: () => this.seedSettings() },
      { name: 'seedLayouts', fn: () => this.seedLayouts() },
      { name: 'seedVisibility', fn: () => this.seedVisibility() },
    ];
    for (const s of seeders) {
      try {
        await s.fn();
      } catch (err) {
        this.logger.warn(
          `${s.name} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ── Default seeders (Phase 277 — idempotent, never overwrite admin edits) ──
  /** Phase 277 — Default dark theme matching Flutter `AppColors`. Inserted only
   * if the `app_themes` table is empty so admin edits to the active theme are
   * preserved across boots. */
  private async seedTheme(): Promise<void> {
    const count = await this.themeRepo.count();
    if (count > 0) return;
    const tokens = {
      colors: {
        primary: '#4ADE80',
        primaryDark: '#22C55E',
        surface: '#161B22',
        background: '#0C1117',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
        accent: '#FCD34D',
        error: '#EF4444',
      },
      // Flat aliases — the live preview / builder read these directly.
      primary: '#4ADE80',
      primaryDark: '#22C55E',
      surface: '#161B22',
      background: '#0C1117',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      accent: '#FCD34D',
      error: '#EF4444',
      typography: {
        fontFamily: 'Inter',
        sizes: { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, '2xl': 24 },
      },
      font: 'Inter',
      fontSizeXs: 11,
      fontSizeSm: 12,
      fontSizeMd: 14,
      fontSizeLg: 16,
      fontSizeXl: 20,
      radius: { sm: 8, md: 12, lg: 20, xl: 28 },
      radiusSm: 8,
      radiusMd: 12,
      radiusLg: 20,
      radiusXl: 28,
      motion: { fast: 120, normal: 200, slow: 400, curve: 'easeOut' },
      motionFast: 120,
      motionNormal: 200,
      motionSlow: 400,
      curve: 'easeOut',
      mode: 'dark',
    };
    const entity = this.themeRepo.create({
      name: 'Yapgitsin Default (Dark)',
      isActive: true,
      tokens: JSON.stringify(tokens),
    });
    await this.themeRepo.save(entity);
    this.logger.log('Seeded default theme (Yapgitsin Default (Dark))');
  }

  /** Phase 277 — Default branding row (`id='default'`). Skipped if it already
   * exists, leaving uploaded logo / icon / splash URLs untouched. */
  private async seedBranding(): Promise<void> {
    const existing = await this.brandingRepo.findOne({ where: { id: 'default' } });
    if (existing) return;
    const entity = this.brandingRepo.create({
      id: 'default',
      appTitle: 'Yapgitsin',
      logoUrl: null,
      iconUrl: null,
      splashUrl: null,
    });
    await this.brandingRepo.save(entity);
    this.logger.log('Seeded default branding');
  }

  /** Phase 277 — Baseline `app_settings` rows. Inserts only missing keys so
   * any admin override (e.g. tweaked `offerTokenCost`) is preserved. */
  private async seedSettings(): Promise<void> {
    const defaults: Array<{ key: string; value: string; type: string; group: string }> = [
      { key: 'appTitle', value: 'Yapgitsin', type: 'string', group: 'general' },
      { key: 'supportPhone', value: '+905550000099', type: 'string', group: 'support' },
      { key: 'supportEmail', value: 'destek@yapgitsin.tr', type: 'string', group: 'support' },
      { key: 'minOfferPrice', value: '50', type: 'number', group: 'offers' },
      { key: 'maxOfferPrice', value: '50000', type: 'number', group: 'offers' },
      { key: 'offerTokenCost', value: '5', type: 'number', group: 'tokens' },
      // Phase 287 — Teklif maliyeti hesaplama modu. 'flat' → offerTokenCost
      // değeri SABİT kredi olarak düşülür (eski davranış). 'percent' →
      // offerTokenCost teklif fiyatının yüzdesi olarak yorumlanır (ör. 1 ⇒
      // %1, ceil + min 1 token). Admin /admin/app-config/settings ile değiştirir.
      { key: 'offerTokenCostMode', value: 'flat', type: 'string', group: 'tokens' },
      { key: 'initialTokenBalance', value: '100', type: 'number', group: 'tokens' },
      { key: 'allowGuestBrowsing', value: 'true', type: 'boolean', group: 'access' },
      { key: 'maintenanceMode', value: 'false', type: 'boolean', group: 'system' },
      { key: 'featuredJobsCount', value: '3', type: 'number', group: 'jobs' },
      // Phase 290 — Yeni ilan açılırken fotoğraf zorunluluğu. Admin
      // /admin/app-config/settings üzerinden true/false ile kontrol eder.
      // Default: false (kullanıcı isteği — şart gizli, opsiyonel).
      { key: 'requirePhotoOnJobPost', value: 'false', type: 'boolean', group: 'jobs' },
    ];
    const existing = await this.settingRepo.find({ select: ['key'] });
    const existingKeys = new Set(existing.map((s) => s.key));
    const missing = defaults.filter((d) => !existingKeys.has(d.key));
    if (!missing.length) return;
    const rows = missing.map((d) =>
      this.settingRepo.create({ ...d, updatedBy: null }),
    );
    await this.settingRepo.save(rows);
    this.logger.log(`Seeded ${rows.length} app settings`);
  }

  /** Phase 277 — Default layouts for `main_shell`, `bottom_nav`, `profile_card`.
   * A screen is seeded only if it has zero rows, so reorderings via the
   * builder are never clobbered. */
  private async seedLayouts(): Promise<void> {
    const navItems = [
      { key: 'home', sortOrder: 0, props: { type: 'tab', icon: 'home', label: 'Yaptır' } },
      { key: 'yapgitsin', sortOrder: 1, props: { type: 'tab', icon: 'search', label: 'Yapgitsin' } },
      { key: 'harita', sortOrder: 2, props: { type: 'tab', icon: 'map', label: 'Harita' } },
      { key: 'iserim', sortOrder: 3, props: { type: 'tab', icon: 'work', label: 'İşlerim' } },
      { key: 'profil', sortOrder: 4, props: { type: 'tab', icon: 'person', label: 'Profil' } },
    ];
    const profileCardItems = [
      { key: 'avatar', sortOrder: 0, props: { type: 'field', label: 'Avatar' } },
      { key: 'fullName', sortOrder: 1, props: { type: 'field', label: 'İsim' } },
      { key: 'verifiedBadge', sortOrder: 2, props: { type: 'field', label: 'Doğrulanmış' } },
      { key: 'premiumLabel', sortOrder: 3, props: { type: 'field', label: 'Premium' } },
      { key: 'averageRating', sortOrder: 4, props: { type: 'field', label: 'Puan' } },
      { key: 'reviewsCount', sortOrder: 5, props: { type: 'field', label: 'Yorumlar' } },
      { key: 'jobsCount', sortOrder: 6, props: { type: 'field', label: 'İşler' } },
      { key: 'completionRate', sortOrder: 7, props: { type: 'field', label: 'Tamamlama' } },
      { key: 'bio', sortOrder: 8, props: { type: 'field', label: 'Bio' } },
      { key: 'categories', sortOrder: 9, props: { type: 'field', label: 'Kategoriler' } },
    ];
    type LayoutSeedItem = {
      key: string;
      sortOrder: number;
      props: Record<string, unknown>;
    };
    const screensToSeed: Array<{ screen: string; items: LayoutSeedItem[] }> = [
      { screen: 'main_shell', items: navItems },
      { screen: 'bottom_nav', items: navItems },
      { screen: 'profile_card', items: profileCardItems },
    ];
    for (const { screen, items } of screensToSeed) {
      const have = await this.layoutRepo.count({ where: { screen } });
      if (have > 0) continue;
      const rows = items.map((it) =>
        this.layoutRepo.create({
          screen,
          componentKey: it.key,
          sortOrder: it.sortOrder,
          visible: true,
          props: JSON.stringify(it.props),
        }),
      );
      await this.layoutRepo.save(rows);
      this.logger.log(`Seeded ${rows.length} layout items for "${screen}"`);
    }
  }

  /** Phase 277 — Sample visibility rules. Each moduleKey is upserted only if
   * absent, so production overrides survive. */
  private async seedVisibility(): Promise<void> {
    const defaults: Array<{
      moduleKey: string;
      active: boolean;
      roles: string[] | null;
    }> = [
      { moduleKey: 'module:premium_features', active: true, roles: ['admin'] },
      { moduleKey: 'module:beta_features', active: false, roles: null },
    ];
    const existing = await this.visibilityRepo.find({ select: ['moduleKey'] });
    const existingKeys = new Set(existing.map((v) => v.moduleKey));
    const missing = defaults.filter((d) => !existingKeys.has(d.moduleKey));
    if (!missing.length) return;
    const rows = missing.map((d) =>
      this.visibilityRepo.create({
        moduleKey: d.moduleKey,
        active: d.active,
        roles: d.roles,
        devices: null,
        activeFrom: null,
        activeUntil: null,
      }),
    );
    await this.visibilityRepo.save(rows);
    this.logger.log(`Seeded ${rows.length} visibility rules`);
  }

  /**
   * Idempotent: inserts only screens whose `key` is not already in the table.
   * Existing rows are never overwritten — admin edits win.
   */
  private async seedScreens(): Promise<void> {
    const existing = await this.screenRepo.find({ select: ['key'] });
    const existingKeys = new Set(existing.map((s) => s.key));
    const missing = KNOWN_SCREENS.filter((s) => !existingKeys.has(s.key));
    if (!missing.length) return;
    const rows = missing.map((s, idx) =>
      this.screenRepo.create({
        key: s.key,
        name: s.name,
        iconName: s.iconName,
        category: s.category,
        sortOrder: s.sortOrder ?? 100 + idx,
        visible: true,
        description: null,
        previewImageUrl: null,
      }),
    );
    await this.screenRepo.save(rows);
    this.logger.log(`Seeded ${rows.length} app screens`);
  }

  // ── Version History / Rollback ──────────────────────────────
  /**
   * Return recent admin-audit-log rows for app-config changes of a given
   * entityType ("theme" | "branding" | "setting" | "layout" | "visibility").
   * Optionally narrows by entityId (matched against targetId).
   */
  async getHistory(
    entityType: string,
    entityId?: string,
    limit = 20,
  ): Promise<AdminAuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .where('log.action LIKE :prefix', { prefix: `app-config.${entityType}.%` })
      .orderBy('log.createdAt', 'DESC')
      .take(Math.max(1, Math.min(100, limit)));
    if (entityId) {
      qb.andWhere('log.targetId = :tid', { tid: entityId });
    }
    return qb.getMany();
  }

  /**
   * Rollback an entity to the state captured in an earlier audit log entry.
   * Reads payload.before (preferred) or payload.snapshot, applies it back to
   * the target entity, and records a new audit row of action
   * `app-config.<type>.rollback`.
   * Returns the updated entity (shape varies by entityType).
   */
  async rollback(
    auditLogId: string,
    adminId: string,
  ): Promise<{ entityType: string; restored: unknown }> {
    const log = await this.auditRepo.findOne({ where: { id: auditLogId } });
    if (!log) throw new NotFoundException('Audit log entry not found');
    if (!log.action.startsWith('app-config.')) {
      throw new BadRequestException('Not an app-config audit entry');
    }
    const parts = log.action.split('.');
    const entityType = parts[1]; // theme | branding | setting | layout | visibility
    const payload = (log.payload ?? {}) as Record<string, unknown>;
    const before = (payload['before'] ?? payload['snapshot']) as
      | Record<string, unknown>
      | undefined;
    if (!before || typeof before !== 'object') {
      throw new BadRequestException(
        'No "before" snapshot in audit payload — rollback not possible',
      );
    }
    const targetId = log.targetId ?? null;
    let restored: unknown;

    switch (entityType) {
      case 'theme': {
        if (!targetId) throw new BadRequestException('Missing theme id');
        const existing = await this.themeRepo.findOne({ where: { id: targetId } });
        if (!existing) throw new NotFoundException('Theme not found');
        if (typeof before['tokens'] === 'object') {
          existing.tokens = JSON.stringify(before['tokens']);
        } else if (typeof before['tokens'] === 'string') {
          existing.tokens = before['tokens'] as string;
        }
        if (typeof before['isActive'] === 'boolean') {
          existing.isActive = before['isActive'] as boolean;
        }
        restored = await this.themeRepo.save(existing);
        break;
      }
      case 'branding': {
        let existing = await this.brandingRepo.findOne({ where: { id: 'default' } });
        if (!existing) existing = this.brandingRepo.create({ id: 'default' });
        for (const k of ['logoUrl', 'iconUrl', 'splashUrl', 'appTitle'] as const) {
          if (k in before) {
            (existing as unknown as Record<string, unknown>)[k] = before[k] ?? null;
          }
        }
        restored = await this.brandingRepo.save(existing);
        break;
      }
      case 'setting': {
        if (!targetId) throw new BadRequestException('Missing setting key');
        const value = before['value'];
        const type = (before['type'] as string) ?? 'string';
        const group = (before['group'] as string) ?? 'general';
        restored = await this.upsertSetting(
          {
            key: targetId,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            type,
            group,
          },
          adminId,
        );
        break;
      }
      case 'visibility': {
        if (!targetId) throw new BadRequestException('Missing moduleKey');
        restored = await this.upsertVisibility(targetId, {
          active: before['active'] as boolean | undefined,
          roles: before['roles'] as string[] | null | undefined,
          devices: before['devices'] as string[] | null | undefined,
          activeFrom: before['activeFrom'] as string | null | undefined,
          activeUntil: before['activeUntil'] as string | null | undefined,
        });
        break;
      }
      default:
        throw new BadRequestException(
          `Rollback for entity type "${entityType}" not supported`,
        );
    }

    // Record the rollback action with a back-reference to the source log.
    const rollbackLog = this.auditRepo.create({
      adminUserId: adminId || null,
      action: `app-config.${entityType}.rollback`,
      targetType: log.targetType,
      targetId: log.targetId,
      payload: { sourceAuditLogId: log.id, restoredFrom: log.createdAt },
    });
    await this.auditRepo.save(rollbackLog);

    return { entityType, restored };
  }

  private parseSettingValue(s: AppSetting): unknown {
    switch (s.type) {
      case 'number': {
        const n = Number(s.value);
        return Number.isFinite(n) ? n : s.value;
      }
      case 'boolean':
        return s.value === 'true' || s.value === '1';
      case 'json':
        try {
          return JSON.parse(s.value);
        } catch {
          return s.value;
        }
      default:
        return s.value;
    }
  }

  private parseJsonSafe(s: string | null | undefined): Record<string, unknown> | null {
    if (!s) return null;
    try {
      const out = JSON.parse(s);
      return out && typeof out === 'object' ? (out as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  async getPublicConfig(): Promise<PublicAppConfig> {
    const [settings, activeTheme, branding, layouts, visibility, screens] =
      await Promise.all([
        this.settingRepo.find(),
        this.themeRepo.findOne({ where: { isActive: true } }),
        this.brandingRepo.findOne({ where: { id: 'default' } }),
        this.layoutRepo.find({ order: { screen: 'ASC', sortOrder: 'ASC' } }),
        this.visibilityRepo.find(),
        this.screenRepo.find({ order: { sortOrder: 'ASC', key: 'ASC' } }),
      ]);

    const settingsMap: Record<string, unknown> = {};
    for (const s of settings) {
      settingsMap[s.key] = this.parseSettingValue(s);
    }

    return {
      settings: settingsMap,
      theme: activeTheme ? this.parseJsonSafe(activeTheme.tokens) : null,
      branding: branding
        ? {
            logoUrl: branding.logoUrl,
            iconUrl: branding.iconUrl,
            splashUrl: branding.splashUrl,
            appTitle: branding.appTitle,
          }
        : null,
      layouts: layouts.map((l) => ({
        screen: l.screen,
        componentKey: l.componentKey,
        sortOrder: l.sortOrder,
        visible: l.visible,
        props: this.parseJsonSafe(l.props),
      })),
      visibility: visibility.map((v) => ({
        moduleKey: v.moduleKey,
        active: v.active,
        roles: v.roles,
        devices: v.devices,
        activeFrom: v.activeFrom ? new Date(v.activeFrom).toISOString() : null,
        activeUntil: v.activeUntil
          ? new Date(v.activeUntil).toISOString()
          : null,
      })),
      screens: screens.map((s) => ({
        key: s.key,
        visible: s.visible,
        sortOrder: s.sortOrder,
      })),
    };
  }

  // ── Screens (Phase 276 — All-Pages Registry) ───────────────────
  listScreens(): Promise<AppScreen[]> {
    return this.screenRepo.find({
      order: { sortOrder: 'ASC', key: 'ASC' },
    });
  }

  async createScreen(dto: CreateScreenDto): Promise<AppScreen> {
    const existing = await this.screenRepo.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Screen "${dto.key}" already exists`);
    }
    const entity = this.screenRepo.create({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      iconName: dto.iconName ?? null,
      category: dto.category ?? null,
      visible: dto.visible ?? true,
      sortOrder: dto.sortOrder ?? 0,
      previewImageUrl: dto.previewImageUrl ?? null,
    });
    return this.screenRepo.save(entity);
  }

  async updateScreen(key: string, dto: UpdateScreenDto): Promise<AppScreen> {
    const existing = await this.screenRepo.findOne({ where: { key } });
    if (!existing) throw new NotFoundException(`Screen "${key}" not found`);
    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.iconName !== undefined) existing.iconName = dto.iconName;
    if (dto.category !== undefined) existing.category = dto.category;
    if (dto.visible !== undefined) existing.visible = dto.visible;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    if (dto.previewImageUrl !== undefined) {
      existing.previewImageUrl = dto.previewImageUrl;
    }
    return this.screenRepo.save(existing);
  }

  async deleteScreen(key: string): Promise<{ deleted: boolean }> {
    const r = await this.screenRepo.delete({ key });
    if (!r.affected) throw new NotFoundException(`Screen "${key}" not found`);
    return { deleted: true };
  }

  // ── Settings helpers ────────────────────────────────────────
  /**
   * Phase 287 — typed getters used by other modules (e.g. TokensService) to
   * read live admin-managed config without touching the repo directly.
   */
  async getSettingString(key: string, fallback: string): Promise<string> {
    const row = await this.settingRepo.findOne({ where: { key } });
    return row?.value ?? fallback;
  }

  async getSettingNumber(key: string, fallback: number): Promise<number> {
    const row = await this.settingRepo.findOne({ where: { key } });
    if (!row) return fallback;
    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Phase 287 — Teklif maliyeti hesabı için config tek noktada okunur.
   * mode='flat'   → cost = value (sabit kredi)
   * mode='percent' → cost = ceil(price * value / 100), min 1
   */
  async getOfferCostConfig(): Promise<{
    mode: 'flat' | 'percent';
    value: number;
  }> {
    const rawMode = await this.getSettingString('offerTokenCostMode', 'flat');
    const mode = rawMode === 'percent' ? 'percent' : 'flat';
    const value = await this.getSettingNumber('offerTokenCost', 5);
    return { mode, value };
  }

  // ── Settings ────────────────────────────────────────────────
  async upsertSetting(dto: UpsertSettingDto, adminId: string): Promise<AppSetting> {
    const existing = await this.settingRepo.findOne({ where: { key: dto.key } });
    if (existing) {
      existing.value = dto.value;
      if (dto.type) existing.type = dto.type;
      if (dto.group) existing.group = dto.group;
      existing.updatedBy = adminId;
      return this.settingRepo.save(existing);
    }
    const entity = this.settingRepo.create({
      key: dto.key,
      value: dto.value,
      type: dto.type ?? 'string',
      group: dto.group ?? 'general',
      updatedBy: adminId,
    });
    return this.settingRepo.save(entity);
  }

  async deleteSetting(key: string): Promise<{ deleted: boolean }> {
    const r = await this.settingRepo.delete({ key });
    if (!r.affected) throw new NotFoundException('Setting not found');
    return { deleted: true };
  }

  // ── Themes ─────────────────────────────────────────────────
  listThemes(): Promise<AppTheme[]> {
    return this.themeRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createTheme(dto: CreateThemeDto): Promise<AppTheme> {
    const entity = this.themeRepo.create({
      name: dto.name,
      tokens: JSON.stringify(dto.tokens),
      isActive: !!dto.isActive,
    });
    const saved = await this.themeRepo.save(entity);
    if (saved.isActive) await this.deactivateOtherThemes(saved.id);
    return saved;
  }

  async updateTheme(id: string, dto: UpdateThemeDto): Promise<AppTheme> {
    const existing = await this.themeRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Theme not found');
    if (dto.tokens !== undefined) existing.tokens = JSON.stringify(dto.tokens);
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    const saved = await this.themeRepo.save(existing);
    if (saved.isActive) await this.deactivateOtherThemes(saved.id);
    return saved;
  }

  async deleteTheme(id: string): Promise<{ deleted: boolean }> {
    const r = await this.themeRepo.delete({ id });
    if (!r.affected) throw new NotFoundException('Theme not found');
    return { deleted: true };
  }

  private async deactivateOtherThemes(activeId: string): Promise<void> {
    await this.themeRepo.update({ id: Not(activeId) }, { isActive: false });
  }

  // ── Branding ───────────────────────────────────────────────
  async updateBranding(dto: UpdateBrandingDto): Promise<AppBranding> {
    let existing = await this.brandingRepo.findOne({ where: { id: 'default' } });
    if (!existing) {
      existing = this.brandingRepo.create({ id: 'default' });
    }
    if (dto.logoUrl !== undefined) existing.logoUrl = dto.logoUrl;
    if (dto.iconUrl !== undefined) existing.iconUrl = dto.iconUrl;
    if (dto.splashUrl !== undefined) existing.splashUrl = dto.splashUrl;
    if (dto.appTitle !== undefined) existing.appTitle = dto.appTitle;
    return this.brandingRepo.save(existing);
  }

  // ── Layouts ────────────────────────────────────────────────
  async replaceLayout(dto: ReplaceLayoutDto): Promise<AppLayout[]> {
    await this.layoutRepo.delete({ screen: dto.screen });
    if (!dto.items.length) return [];
    const entities = dto.items.map((it) =>
      this.layoutRepo.create({
        screen: dto.screen,
        componentKey: it.componentKey,
        sortOrder: it.sortOrder,
        visible: it.visible,
        props: it.props == null ? null : JSON.stringify(it.props),
      }),
    );
    return this.layoutRepo.save(entities);
  }

  // ── Visibility ─────────────────────────────────────────────
  async upsertVisibility(
    moduleKey: string,
    dto: UpsertVisibilityDto,
  ): Promise<AppVisibilityRule> {
    let existing = await this.visibilityRepo.findOne({ where: { moduleKey } });
    if (!existing) {
      existing = this.visibilityRepo.create({ moduleKey, active: true });
    }
    if (dto.active !== undefined) existing.active = dto.active;
    if (dto.roles !== undefined) existing.roles = dto.roles;
    if (dto.devices !== undefined) existing.devices = dto.devices;
    if (dto.activeFrom !== undefined) {
      existing.activeFrom = dto.activeFrom ? new Date(dto.activeFrom) : null;
    }
    if (dto.activeUntil !== undefined) {
      existing.activeUntil = dto.activeUntil ? new Date(dto.activeUntil) : null;
    }
    return this.visibilityRepo.save(existing);
  }

  async deleteVisibility(moduleKey: string): Promise<{ deleted: boolean }> {
    const r = await this.visibilityRepo.delete({ moduleKey });
    if (!r.affected) throw new NotFoundException('Visibility rule not found');
    return { deleted: true };
  }
}
