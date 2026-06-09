/**
 * Phase 489 (Faz J/2) — RBAC permission matrix.
 *
 * 5 roles × 25 modules × 3 actions (read/write/delete).
 *
 * Backward compat:
 *   - User.adminRole NULL → treated as 'super_admin' (legacy single-admin model).
 *   - Non-admin User.role values bypass this matrix entirely (the controller-level
 *     AdminGuard already blocks them).
 */

export const RBAC_MODULES = [
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
] as const;

export type RbacModule = (typeof RBAC_MODULES)[number];

export const RBAC_ACTIONS = ['read', 'write', 'delete'] as const;
export type RbacAction = (typeof RBAC_ACTIONS)[number];

export const RBAC_ROLES = [
  'super_admin',
  'admin',
  'moderator',
  'content_editor',
  'analyst',
] as const;
export type RbacRole = (typeof RBAC_ROLES)[number];

type Matrix = Record<RbacRole, Partial<Record<RbacModule, RbacAction[]>>>;

const all: RbacAction[] = ['read', 'write', 'delete'];
const rw: RbacAction[] = ['read', 'write'];
const r: RbacAction[] = ['read'];

const allModules = (actions: RbacAction[]): Partial<Record<RbacModule, RbacAction[]>> =>
  Object.fromEntries(RBAC_MODULES.map((m) => [m, actions])) as Partial<
    Record<RbacModule, RbacAction[]>
  >;

export const RBAC_MATRIX: Matrix = {
  super_admin: allModules(all),
  admin: {
    ...allModules(rw),
    // system-critical modules: read-only for plain admin
    'system-settings': r,
    'apk-builder': r,
  },
  moderator: {
    moderation: rw,
    reports: rw,
    disputes: rw,
    'audit-log': r,
    'blocked-ips': rw,
    users: r,
    jobs: r,
    providers: r,
    messages: r,
  },
  content_editor: {
    categories: rw,
    'seo-pillars': rw,
    'seo-keywords': rw,
    'seo-gsc': r,
    'seo-404': rw,
    broadcast: rw,
    'ai-assistant': rw,
    'quality-check': rw,
  },
  analyst: {
    jobs: r,
    users: r,
    providers: r,
    revenue: r,
    'audit-log': r,
    messages: r,
    loyalty: r,
    moderation: r,
    reports: r,
    disputes: r,
    'crypto-deposits': r,
    'seo-gsc': r,
    'seo-keywords': r,
    'seo-pillars': r,
    'seo-404': r,
    'dns-health': r,
  },
};

/**
 * Resolve effective role for an authenticated admin.
 * - Falls back to 'super_admin' when adminRole is null/undefined (legacy admins).
 */
export function resolveRbacRole(adminRole?: string | null): RbacRole {
  if (!adminRole) return 'super_admin';
  return (RBAC_ROLES as readonly string[]).includes(adminRole)
    ? (adminRole as RbacRole)
    : 'super_admin';
}

export function hasPermission(
  role: RbacRole,
  module: RbacModule,
  action: RbacAction,
): boolean {
  const perms = RBAC_MATRIX[role]?.[module];
  return Array.isArray(perms) && perms.includes(action);
}

export function getMatrixSnapshot() {
  return {
    modules: RBAC_MODULES,
    actions: RBAC_ACTIONS,
    roles: RBAC_ROLES.map((key) => ({
      key,
      permissions: RBAC_MATRIX[key],
    })),
  };
}
