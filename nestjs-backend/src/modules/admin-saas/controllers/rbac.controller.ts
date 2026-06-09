import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';

/**
 * M11 — RBAC Matrix (read-only preview).
 *
 * Yapgitsin currently uses a binary admin role enum. This endpoint returns the
 * intended fine-grained matrix as a *design preview* — UI shows what a future
 * multi-role rollout would look like. Toggling has no effect yet; storage
 * layer (admin_roles / role_permissions) lands in Faz J.
 */
const MODULES = [
  'jobs',
  'users',
  'providers',
  'categories',
  'broadcast',
  'revenue',
  'crypto-deposits',
  'moderation',
  'reports',
  'disputes',
  'audit-log',
  'blocked-ips',
  'escrow-settings',
  'apk-builder',
  'system-settings',
  'ai-assistant',
  'quality-check',
  'cron-hub',
  'messages',
  'loyalty',
  'seo-gsc',
  'seo-keywords',
  'seo-pillars',
  'seo-404',
  'dns-health',
];

const ACTIONS = ['read', 'write', 'delete'] as const;
type Action = (typeof ACTIONS)[number];

interface Role {
  key: string;
  name: string;
  description: string;
  permissions: Record<string, Action[]>;
}

const ROLES: Role[] = [
  {
    key: 'super_admin',
    name: 'Süper Admin',
    description: 'Tüm modüllere tam erişim. Sistem sahibi.',
    permissions: Object.fromEntries(MODULES.map((m) => [m, ['read', 'write', 'delete']])),
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Standart admin — silme yetkisi kısıtlı.',
    permissions: Object.fromEntries(
      MODULES.map((m) => [m, ['read', 'write'] as Action[]]),
    ),
  },
  {
    key: 'moderator',
    name: 'Moderatör',
    description: 'Sadece moderasyon, raporlar, anlaşmazlık ve audit.',
    permissions: Object.fromEntries(
      MODULES.map((m) => {
        const allow: Action[] =
          ['moderation', 'reports', 'disputes', 'audit-log', 'blocked-ips'].includes(m)
            ? ['read', 'write']
            : ['read'];
        return [m, allow];
      }),
    ),
  },
  {
    key: 'support',
    name: 'Destek',
    description: 'Yalnızca okuma + müşteri mesajları.',
    permissions: Object.fromEntries(
      MODULES.map((m) => {
        const allow: Action[] = m === 'messages' ? ['read', 'write'] : ['read'];
        return [m, allow];
      }),
    ),
  },
  {
    key: 'seo',
    name: 'SEO Uzmanı',
    description: 'Sadece SEO + AI + içerik araçları.',
    permissions: Object.fromEntries(
      MODULES.map((m) => {
        const allow: Action[] = m.startsWith('seo-') || m === 'ai-assistant' || m === 'categories'
          ? ['read', 'write']
          : m === 'audit-log'
            ? ['read']
            : [];
        return [m, allow];
      }),
    ),
  },
];

@Controller('admin/rbac')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class RbacController {
  @Get('matrix')
  matrix() {
    return {
      modules: MODULES,
      actions: ACTIONS,
      roles: ROLES,
      note:
        'Şu an Yapgitsin tek bir admin rolü ile çalışır. Bu matris çoklu-rol geçişi için tasarım önizlemesidir; toggle pasif.',
    };
  }

  @Get('current')
  current() {
    return {
      role: 'super_admin',
      description:
        'Tüm modüllere erişiminiz var. Çoklu rol modeli Faz J (RBAC enforcement) ile devreye girecek.',
    };
  }
}
