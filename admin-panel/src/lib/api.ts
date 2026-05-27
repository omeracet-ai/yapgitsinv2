// Phase 183 — admin panel API artık api.yapgitsin.tr subdomain'inde (web/flutter ile paralel).
// Dev için localhost:3001 fallback korunur.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_refresh_token');
}

/** Admin refresh flow — persist a freshly issued access+refresh pair. */
export function setAdminTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('admin_token', accessToken);
  if (refreshToken) localStorage.setItem('admin_refresh_token', refreshToken);
}

function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_user');
}

// Single-flight refresh lock: parallel 401s share ONE /auth/refresh call so a
// rotating refresh token isn't burned by concurrent requests.
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the stored refresh token for a new access+refresh pair via the shared
 * backend /auth/refresh endpoint (rotates tokenVersion). Returns true on success.
 * On failure clears the session so the guard/redirect can take over.
 * Backend returns camelCase { accessToken, refreshToken }.
 */
export async function refreshAdminToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        clearAdminSession();
        return false;
      }
      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!data.accessToken) {
        clearAdminSession();
        return false;
      }
      setAdminTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearAdminSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function redirectToLogin() {
  if (typeof window !== 'undefined') window.location.href = '/login';
}

async function request<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  // 401 → try a one-time refresh + retry before failing (admin refresh flow).
  // Phase 278b: refresh token yok bile olsa 401 → login ekranına yönlendir
  // (eski 'sessiz hata' bug'ı kapandı).
  if (res.status === 401 && !_retried) {
    if (getRefreshToken() && (await refreshAdminToken())) {
      return request<T>(path, init, true);
    }
    clearAdminSession();
    redirectToLogin();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, formData: FormData, _retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 401 && !_retried) {
    if (getRefreshToken() && (await refreshAdminToken())) {
      return uploadFile<T>(path, formData, true);
    }
    clearAdminSession();
    redirectToLogin();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down' | string;
  uptime: number;
  version: string;
  buildSha?: string;
  commit?: string;
  memory?: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  checks?: { database?: string; cache?: string; iyzipay?: string };
  migrationsPending?: number;
  timestamp: string;
}

async function requestNoAuth<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

// ── P191/4 — Server-side pagination helpers ──────────────────────────────
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

function buildAdminListQuery(p: AdminListParams): string {
  const sp = new URLSearchParams();
  if (p.page !== undefined) sp.set('page', String(p.page));
  if (p.limit !== undefined) sp.set('limit', String(p.limit));
  if (p.search) sp.set('search', p.search);
  if (p.status) sp.set('status', p.status);
  return sp.toString();
}

export const api = {
  // Health (no auth)
  getHealth: () => requestNoAuth<HealthStatus>('/health'),

  // Auth
  adminLogin: (username: string, password: string) =>
    request<{ access_token: string; refresh_token?: string; user: AdminUser }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // P191/2 — server-side logout (token blacklist). Safe to call even if backend
  // hasn't deployed the endpoint yet: network/4xx errors are swallowed by caller.
  adminLogout: async (): Promise<void> => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok && res.status !== 404) {
        console.warn(`adminLogout: backend returned ${res.status}`);
      }
    } catch (err) {
      console.warn('adminLogout: network error, continuing client-side logout', err);
    }
  },

  // Dashboard
  stats: () =>
    request<{
      totalJobs: number;
      totalUsers: number;
      totalProviders: number;
      verifiedProviders: number;
      chartData?: {
        jobsPerDay: Array<{ date: string; count: number }>;
        usersPerDay: Array<{ date: string; count: number }>;
      };
    }>('/admin/stats'),

  // Public marketplace stats (no auth) — Phase 206
  publicStats: () =>
    requestNoAuth<{
      totalJobs: number;
      totalWorkers: number;
      completedJobs: number;
      totalCategories: number;
    }>('/stats/public'),

  // Gelir / Platform fee
  revenue: () =>
    request<{
      totalGross: number;
      totalPlatformFee: number;
      totalTaskerNet: number;
      releasedCount: number;
      last30Days: {
        totalGross: number;
        totalPlatformFee: number;
        totalTaskerNet: number;
        releasedCount: number;
      };
    }>('/admin/revenue'),

  // Son İlanlar
  recentJobs: (limit = 20) => request<Job[]>(`/admin/jobs?limit=${limit}`),

  // P191/4 — Paginated admin jobs list (search + status filter)
  getJobs: (params: AdminListParams = {}) =>
    request<Paginated<Job>>(`/admin/jobs?${buildAdminListQuery(params)}`),

  // Kullanıcılar
  users: () => request<User[]>('/admin/users'),

  // P191/4 — Paginated admin users list (search + status filter)
  getUsers: (params: AdminListParams = {}) =>
    request<Paginated<User>>(`/admin/users?${buildAdminListQuery(params)}`),
  bulkVerifyUsers: (userIds: string[], identityVerified: boolean) =>
    request<BulkVerifyResult>('/admin/users/bulk-verify', {
      method: 'POST',
      body: JSON.stringify({ userIds, identityVerified }),
    }),
  bulkFeatureUsers: (userIds: string[], featuredOrder: 1 | 2 | 3 | null) =>
    request<BulkFeatureResult>('/admin/users/bulk-feature', {
      method: 'POST',
      body: JSON.stringify({ userIds, featuredOrder }),
    }),
  bulkUnfeatureUsers: (userIds: string[]) =>
    request<BulkFeatureResult>('/admin/users/bulk-unfeature', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),
  suspendUser: (userId: string, suspended: boolean, reason?: string) =>
    request<{ id: string; suspended: boolean; suspendedReason: string | null; suspendedAt: string | null; suspendedBy: string | null }>(
      `/admin/users/${userId}/suspend`,
      { method: 'PATCH', body: JSON.stringify({ suspended, ...(reason ? { reason } : {}) }) },
    ),

  // Kategoriler — admin panel pasif olanları da görmeli
  categories:     ()                             => request<Category[]>('/admin/categories'),
  createCategory: (data: Partial<Category>)      => request<Category>('/categories',      { method: 'POST',  body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<Category>) => request<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string)                   => request<void>(`/categories/${id}`,    { method: 'DELETE' }),

  // Sağlayıcılar & Mavi Tik
  providers:       ()                                    => request<Provider[]>('/admin/providers'),
  // P191/4 — Paginated admin providers list (search + status filter)
  getProviders: (params: AdminListParams = {}) =>
    request<Paginated<Provider>>(`/admin/providers?${buildAdminListQuery(params)}`),
  setVerification: (id: string, isVerified: boolean)     =>
    request<Provider>(`/admin/providers/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ isVerified }) }),

  // Phase 159 — Worker Certifications
  pendingCertifications: () =>
    request<Array<{
      id: string;
      userId: string;
      name: string;
      issuer: string;
      issuedAt: string;
      expiresAt: string | null;
      documentUrl: string | null;
      verified: boolean;
      adminNote: string | null;
      createdAt: string;
    }>>('/admin/certifications'),
  verifyCertification: (id: string, adminNote?: string) =>
    request<{ id: string; verified: boolean }>(`/admin/certifications/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote }),
    }),
  rejectCertification: (id: string, adminNote?: string) =>
    request<{ id: string; verified: boolean }>(`/admin/certifications/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNote }),
    }),

  // Phase 262 — USDT-TRC20 manuel yatırım talepleri
  cryptoDeposits: (status?: string) =>
    request<Array<{
      id: string;
      userId: string;
      network: string;
      asset: string;
      amountUsdt: number;
      txId: string;
      creditAmount: number;
      purpose: string;
      status: 'pending' | 'approved' | 'rejected';
      adminNote: string | null;
      reviewedByAdminId: string | null;
      createdAt: string;
      reviewedAt: string | null;
    }>>(`/admin/crypto-deposits${status ? `?status=${status}` : ''}`),
  approveCryptoDeposit: (id: string, note?: string, creditAmount?: number) =>
    request<{ id: string; status: string; newBalance?: number }>(
      `/admin/crypto-deposits/${id}/approve`,
      { method: 'PATCH', body: JSON.stringify({ note, creditAmount }) },
    ),
  rejectCryptoDeposit: (id: string, note?: string) =>
    request<{ id: string; status: string }>(
      `/admin/crypto-deposits/${id}/reject`,
      { method: 'PATCH', body: JSON.stringify({ note }) },
    ),

  // Öne Çıkan İlanlar
  setFeaturedOrder: (id: string, featuredOrder: number | null) =>
    request<void>(`/admin/jobs/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featuredOrder }) }),

  // Öne Çıkan Ustalar
  setProviderFeatured: (id: string, featuredOrder: number | null) =>
    request<void>(`/admin/providers/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featuredOrder }) }),

  // Airtasker-style rozetler — manuel rozetleri user-level set eder
  setUserBadges: (userId: string, badges: string[]) =>
    request<{ id: string; badges: string[] }>(`/admin/users/${userId}/badges`, { method: 'PATCH', body: JSON.stringify({ badges }) }),

  // Tasker skills — workerCategories'tan ayrı, granular yetenek tag'leri
  setUserSkills: (userId: string, skills: string[]) =>
    request<{ id: string; workerSkills: string[] }>(`/admin/users/${userId}/skills`, { method: 'PATCH', body: JSON.stringify({ skills }) }),

  // Phase 137 — Manuel admin rozet grant/revoke
  grantBadge: (userId: string, badgeKey: string) =>
    request<{ id: string; manualBadges: string[] }>(`/admin/users/${userId}/badges/grant`, { method: 'POST', body: JSON.stringify({ badgeKey }) }),
  revokeBadge: (userId: string, badgeKey: string) =>
    request<{ id: string; manualBadges: string[] }>(`/admin/users/${userId}/badges/revoke`, { method: 'POST', body: JSON.stringify({ badgeKey }) }),

  // Phase 260 — Manuel jeton tanımlama/düzeltme (serbest kullanıcı satın alma kaldırıldı).
  // amount: pozitif = ekle, negatif = düş (bakiye floor 0).
  grantTokens: (userId: string, amount: number, reason?: string) =>
    request<{ balance: number; amount: number }>(`/admin/users/${userId}/tokens/grant`, {
      method: 'POST',
      body: JSON.stringify({ amount, ...(reason ? { reason } : {}) }),
    }),

  // Onboarding slides
  onboardingSlides:       ()                                          => request<OnboardingSlide[]>('/onboarding-slides/all'),
  createOnboardingSlide:  (data: Partial<OnboardingSlide>)           => request<OnboardingSlide>('/onboarding-slides',         { method: 'POST',   body: JSON.stringify(data) }),
  updateOnboardingSlide:  (id: string, data: Partial<OnboardingSlide>) => request<OnboardingSlide>(`/onboarding-slides/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
  deleteOnboardingSlide:  (id: string)                               => request<void>(`/onboarding-slides/${id}`,              { method: 'DELETE' }),
  reorderOnboardingSlides:(ids: string[])                            => request<void>('/onboarding-slides/reorder',            { method: 'PATCH',  body: JSON.stringify({ ids }) }),
  // Branding asset upload (admin only) — kind: 'logo' | 'icon' | 'splash'
  uploadBranding: (file: File, kind: 'logo' | 'icon' | 'splash') => {
    const fd = new FormData();
    fd.append('file', file);
    return uploadFile<{ url: string; kind: string }>(
      `/uploads/branding?kind=${kind}`,
      fd,
    );
  },
  uploadOnboardingImage:  (file: File)                               => {
    const fd = new FormData();
    fd.append('image', file);
    return uploadFile<{ url: string }>('/uploads/onboarding-image', fd);
  },

  // Moderation
  flaggedItems:           ()                => request<FlaggedItem[]>('/admin/moderation/flagged'),
  getModerationQueue: (opts: { type: 'job' | 'review' | 'chat'; page?: number; limit?: number }) => {
    const p = new URLSearchParams();
    p.set('type', opts.type);
    if (opts.page !== undefined) p.set('page', String(opts.page));
    if (opts.limit !== undefined) p.set('limit', String(opts.limit));
    return request<ModerationQueueResponse>(`/admin/moderation/queue?${p.toString()}`);
  },
  moderateItem: (type: 'job' | 'review' | 'chat', id: string, action: 'approve' | 'remove' | 'ban_user', adminNote?: string) =>
    request<{ id: string; type: string; action: string; ok: boolean }>(
      `/admin/moderation/${type}/${id}`,
      { method: 'PATCH', body: JSON.stringify({ action, ...(adminNote ? { adminNote } : {}) }) },
    ),
  deleteFlaggedChat:      (id: string)      => request<{ id: string; type: string; cleared: boolean }>(`/admin/moderation/chat/${id}`,     { method: 'DELETE' }),
  deleteFlaggedQuestion:  (id: string)      => request<{ id: string; type: string; cleared: boolean }>(`/admin/moderation/question/${id}`, { method: 'DELETE' }),

  // Disputes (Phase 117 + 144)
  disputes: (opts: { status?: string; page?: number; limit?: number } = {}) => {
    const p = new URLSearchParams();
    if (opts.status && opts.status !== 'all') p.set('status', opts.status);
    if (opts.page !== undefined) p.set('page', String(opts.page));
    if (opts.limit !== undefined) p.set('limit', String(opts.limit));
    const qs = p.toString();
    return request<AdminDisputesResponse>(`/admin/disputes/list${qs ? `?${qs}` : ''}`);
  },
  resolveDispute: (id: string, dto: { status: 'resolved' | 'dismissed'; resolution: string }) =>
    request<AdminDispute>(`/admin/disputes/general/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  // Şikayetler
  reports: (status?: string) =>
    request<UserReport[]>(`/admin/reports${status && status !== 'all' ? `?status=${status}` : ''}`),
  updateReport: (id: string, dto: { status: string; adminNote?: string }) =>
    request<UserReport>(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  // Audit log
  auditLog: (opts: { limit?: number; offset?: number; action?: string; targetType?: string; adminUserId?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.limit !== undefined) p.set('limit', String(opts.limit));
    if (opts.offset !== undefined) p.set('offset', String(opts.offset));
    if (opts.action) p.set('action', opts.action);
    if (opts.targetType) p.set('targetType', opts.targetType);
    if (opts.adminUserId) p.set('adminUserId', opts.adminUserId);
    return request<AuditLogResponse>(`/admin/audit-log?${p.toString()}`);
  },
  auditLogExport: async (opts: { action?: string; targetType?: string; adminUserId?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.action) p.set('action', opts.action);
    if (opts.targetType) p.set('targetType', opts.targetType);
    if (opts.adminUserId) p.set('adminUserId', opts.adminUserId);
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const res = await fetch(`${BASE}/admin/audit-log/export?${p.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Export ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    return res.blob();
  },
  auditLogStats: (days?: number) =>
    request<AuditLogStats>(`/admin/audit-log/stats${days ? `?days=${days}` : ''}`),
  previewAuditLogPurge: (olderThanDays: number) =>
    request<{ wouldDelete: number; cutoffDate: string; olderThanDays: number }>(
      `/admin/audit-log/purge-preview?olderThanDays=${olderThanDays}`,
    ),
  purgeAuditLog: (olderThanDays: number) =>
    request<{ deleted: number; cutoffDate: string; olderThanDays: number }>(
      '/admin/audit-log/purge',
      { method: 'POST', body: JSON.stringify({ olderThanDays, confirm: true }) },
    ),

  // Promo codes
  promoCodes:       ()                                  => request<PromoCode[]>('/admin/promo-codes'),
  createPromoCode:  (data: Partial<PromoCode>)          => request<PromoCode>('/admin/promo-codes',         { method: 'POST',   body: JSON.stringify(data) }),
  updatePromoCode:  (id: string, data: Partial<PromoCode>) => request<PromoCode>(`/admin/promo-codes/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
  deletePromoCode:  (id: string)                        => request<void>(`/admin/promo-codes/${id}`,        { method: 'DELETE' }),

  // Harita — koordinat güncelleme
  setJobLocation: (id: string, latitude: number, longitude: number) =>
    request<{ id: string }>(`/admin/jobs/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    }),
  setUserLocation: (id: string, latitude: number, longitude: number) =>
    request<{ id: string }>(`/admin/users/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    }),

  // Broadcast notifications
  broadcastNotification: (data: { title: string; message: string; segment: 'all' | 'workers' | 'customers' | 'verified_workers' }) =>
    request<{ sent: number; segment: string }>('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  broadcastHistory: () =>
    request<{ title: string; body: string; createdAt: string; count: number }[]>(
      '/admin/notifications/broadcast/history',
    ),

  // Phase 158 — Blog CMS
  blogList: (page = 1, limit = 50) =>
    request<{ data: BlogPost[]; total: number; page: number; limit: number; pages: number }>(
      `/admin/blog?page=${page}&limit=${limit}`,
    ),
  blogGet:    (id: string)                       => request<BlogPost>(`/admin/blog/${id}`),
  blogCreate: (data: Partial<BlogPost>)          => request<BlogPost>('/admin/blog',           { method: 'POST',   body: JSON.stringify(data) }),
  blogUpdate: (id: string, data: Partial<BlogPost>) => request<BlogPost>(`/admin/blog/${id}`,  { method: 'PATCH',  body: JSON.stringify(data) }),
  blogDelete: (id: string)                       => request<void>(`/admin/blog/${id}`,         { method: 'DELETE' }),

  // Phase 254b — Platform commission + token economy view
  getCommissionSettings: () =>
    request<{ commissionPctQr: number; offerTokenCost: number }>(
      '/admin/settings/commission',
    ),
  updateCommissionSettings: (commissionPctQr: number) =>
    request<{ commissionPctQr: number; offerTokenCost: number }>(
      '/admin/settings/commission',
      { method: 'PATCH', body: JSON.stringify({ commissionPctQr }) },
    ),

  // System settings (Phase 77)
  listSettings: () => request<SystemSetting[]>('/admin/settings'),
  getSetting:   (key: string) => request<{ key: string; value: string }>(`/admin/settings/${key}`),
  updateSetting:(key: string, value: string) =>
    request<SystemSetting>(`/admin/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

  // ── APK App Config (Voldi-design+fs) ────────────────────────────────────
  // Public preview snapshot (no auth) — used by ApkPreviewModal live render.
  getAppConfig: () => requestNoAuth<AppConfigPublic>('/app-config'),
  // Admin full state — read-only aggregate of theme/branding/settings/layouts/rules.
  getAdminAppConfig: async (): Promise<AdminAppConfig> => {
    // Backend returns getPublicConfig() shape: settings as dict, theme single, branding null|obj.
    // Admin UI needs array shapes. Normalize at boundary.
    type RawShape = {
      settings?: Record<string, unknown>;
      theme?: Record<string, unknown> | null;
      branding?: AppConfigBranding | null;
      layouts?: Array<{
        screen: string;
        componentKey?: string;
        sortOrder?: number;
        visible?: boolean;
        props?: Record<string, unknown> | null;
      }>;
      visibility?: Array<{
        moduleKey: string;
        active?: boolean;
        roles?: string[];
        devices?: string[];
        startsAt?: string | null;
        endsAt?: string | null;
      }>;
    };
    const [raw, themesRaw] = await Promise.all([
      request<RawShape>('/admin/app-config'),
      // Real list of themes (with id + isActive) so the builder and ThemeTab
      // see live data instead of the placeholder empty array. Falls back to
      // empty list if the endpoint is unreachable.
      request<Array<{ id: string; name: string; isActive: boolean; tokens: string | AppConfigThemeTokens }>>('/admin/app-config/themes').catch(() => []),
    ]);
    // settings dict → array
    const settingsArr: AppConfigSetting[] = Object.entries(raw.settings ?? {}).map(
      ([key, value]) => ({
        key,
        value,
        type:
          typeof value === 'boolean'
            ? 'boolean'
            : typeof value === 'number'
              ? 'number'
              : typeof value === 'object'
                ? 'json'
                : 'string',
      }),
    );
    // layouts: backend has componentKey/sortOrder per item, group by screen
    const layoutMap = new Map<string, AppConfigLayoutItem[]>();
    for (const l of raw.layouts ?? []) {
      const arr = layoutMap.get(l.screen) ?? [];
      arr.push({
        key: l.componentKey ?? '',
        visible: l.visible ?? true,
        props: (l.props ?? {}) as Record<string, unknown>,
      });
      layoutMap.set(l.screen, arr);
    }
    const layoutsArr: AppConfigLayout[] = Array.from(layoutMap.entries()).map(
      ([screen, items]) => ({ screen, items }),
    );
    // visibility: active → enabled
    const visibilityArr: AppConfigVisibilityRule[] = (raw.visibility ?? []).map(
      (v) => ({
        moduleKey: v.moduleKey,
        roles: v.roles ?? [],
        devices: v.devices ?? [],
        startsAt: v.startsAt ?? null,
        endsAt: v.endsAt ?? null,
        enabled: v.active ?? true,
      }),
    );
    // Backend stores tokens as a JSON-encoded string; parse defensively here so
    // the UI consumers always see an object.
    const themesArr: AppConfigTheme[] = (themesRaw ?? []).map((t) => {
      let tokens: AppConfigThemeTokens = {};
      if (typeof t.tokens === 'string') {
        try { tokens = JSON.parse(t.tokens) as AppConfigThemeTokens; }
        catch { tokens = {}; }
      } else if (t.tokens && typeof t.tokens === 'object') {
        tokens = t.tokens;
      }
      return { id: t.id, name: t.name, isActive: !!t.isActive, tokens };
    });
    return {
      branding: raw.branding ?? {},
      themes: themesArr,
      settings: settingsArr,
      layouts: layoutsArr,
      visibility: visibilityArr,
    };
  },
  // Settings CRUD (key/value with type+group). value is stringified at the boundary
  // by the backend; clients send the native shape.
  patchSetting: (key: string, value: unknown, opts?: { type?: string; group?: string }) =>
    request<AppConfigSetting>('/admin/app-config/setting', {
      method: 'PATCH',
      body: JSON.stringify({ key, value, ...(opts ?? {}) }),
    }),
  deleteSetting: (key: string) =>
    request<void>(`/admin/app-config/setting/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  // Theme — create new (name + tokens) or update existing (tokens / isActive flag).
  postTheme: (data: { name: string; tokens: AppConfigThemeTokens; isActive?: boolean }) =>
    request<AppConfigTheme>('/admin/app-config/theme', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  patchTheme: (id: string, data: Partial<{ tokens: AppConfigThemeTokens; isActive: boolean }>) =>
    request<AppConfigTheme>(`/admin/app-config/theme/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  // Branding — logo / icon / splash URLs + app title.
  patchBranding: (data: Partial<AppConfigBranding>) =>
    request<AppConfigBranding>('/admin/app-config/branding', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  // Layout — per-screen ordered item list (drag-reorder result).
  putLayout: (screen: string, items: AppConfigLayoutItem[]) =>
    request<AppConfigLayout>('/admin/app-config/layout', {
      method: 'PUT',
      body: JSON.stringify({ screen, items }),
    }),
  // History / Rollback (Voldi-fs Utility 1)
  getAppConfigHistory: (type: string, id?: string, limit = 20) =>
    request<Array<{
      id: string;
      action: string;
      targetType: string | null;
      targetId: string | null;
      payload: Record<string, unknown> | null;
      adminUserId: string | null;
      actorEmail: string | null;
      createdAt: string;
    }>>(
      `/admin/app-config/history?type=${encodeURIComponent(type)}${
        id ? `&id=${encodeURIComponent(id)}` : ''
      }&limit=${limit}`,
    ),
  rollbackAppConfig: (auditLogId: string) =>
    request<{ entityType: string; restored: unknown }>(
      `/admin/app-config/rollback/${encodeURIComponent(auditLogId)}`,
      { method: 'POST' },
    ),

  // Visibility rules — role / device / date window per moduleKey.
  patchVisibility: (moduleKey: string, data: Partial<AppConfigVisibilityRule>) =>
    request<AppConfigVisibilityRule>(`/admin/app-config/visibility/${encodeURIComponent(moduleKey)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Screens registry (Phase 276 — All-Pages Registry)
  listScreens: () => request<AppScreen[]>('/admin/app-config/screens'),
  createScreen: (data: Omit<AppScreen, 'createdAt' | 'updatedAt'>) =>
    request<AppScreen>('/admin/app-config/screen', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateScreen: (key: string, data: Partial<Omit<AppScreen, 'key' | 'createdAt' | 'updatedAt'>>) =>
    request<AppScreen>(`/admin/app-config/screen/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteScreen: (key: string) =>
    request<{ deleted: boolean }>(`/admin/app-config/screen/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),

  // ── Backup Manager ─────────────────────────────────────────────────────
  createBackup: () =>
    request<{ filename: string; size: number; path: string; createdAt: string }>(
      '/admin/backup/create',
      { method: 'POST' },
    ),
  listBackups: () =>
    request<Array<{ filename: string; size: number; createdAt: string }>>(
      '/admin/backup/list',
    ),
  /**
   * Triggers a browser download for the given backup file. Uses fetch + Blob
   * so we can attach the admin Bearer header (anchor href cannot send it).
   */
  downloadBackup: async (filename: string): Promise<void> => {
    // IIS .sqlite uzantısını URL path'inde blokluyor → query param kullan.
    const token = getToken();
    const res = await fetch(
      `${BASE}/admin/backup/download?filename=${encodeURIComponent(filename)}`,
      {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Download ${res.status}: ${text}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  deleteBackup: (filename: string) =>
    request<{ deleted: true }>(
      `/admin/backup?filename=${encodeURIComponent(filename)}`,
      { method: 'DELETE' },
    ),
  restoreBackup: (filename: string, confirmToken: string) =>
    request<{
      ok: boolean;
      restoredFrom: string;
      preRestoreSnapshot: string | null;
      note: string;
    }>(`/admin/backup/restore`, {
      method: 'POST',
      body: JSON.stringify({ filename, confirmToken }),
    }),

  // Phase 162: Chat & Messaging
  sendMessage: (to: string, message: string, jobLeadId?: string) =>
    request<ChatMessageDto>('/messages', {
      method: 'POST',
      body: JSON.stringify({ to, message, jobLeadId }),
    }),
  getConversations: () =>
    request<ConversationItemDto[]>('/messages/conversations'),
  getMessageHistory: (peerId: string) =>
    request<ChatMessageDto[]>(`/messages/history/${peerId}`),
  markMessageAsRead: (messageId: string) =>
    request<{ success: boolean }>(`/messages/${messageId}/read`, { method: 'POST' }),
  markMessagesAsRead: (messageIds: string[]) =>
    request<{ success: boolean; markedCount: number }>('/messages/batch/read', {
      method: 'POST',
      body: JSON.stringify({ messageIds }),
    }),
  getUnreadCount: () =>
    request<{ unreadCount: number }>('/messages/unread-count'),
  deleteMessage: (messageId: string) =>
    request<{ success: boolean }>(`/messages/${messageId}`, { method: 'DELETE' }),

  // ── Phase 268 — Realtime Analytics ─────────────────────────────────────────
  getRealtimeOnline: () =>
    request<{
      count: number;
      users: Array<{ id: string; fullName: string }>;
      updatedAt: string;
    }>('/admin/realtime/online'),

  getRealtimeSessions: (days = 7) =>
    request<{
      days: number;
      since: string;
      onlineNow: number;
      users: Array<{
        id: string;
        fullName: string;
        lastSeenAt: string | null;
        isOnline: boolean;
      }>;
    }>(`/admin/realtime/sessions?days=${days}`),

  getEnrichedStats: () =>
    request<{
      totalJobs: number;
      totalUsers: number;
      totalWorkers: number;
      verifiedWorkers: number;
      totalOffers: number;
      totalBookings: number;
      totalReviews: number;
      openJobs: number;
      completedJobs: number;
      usersOnlineNow: number;
      signupsLast7d: number;
      jobsLast7d: number;
      activeWorkers7d: number;
      chartData?: {
        jobsPerDay: Array<{ date: string; count: number }>;
        usersPerDay: Array<{ date: string; count: number }>;
      };
    }>('/admin/stats'),
};

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl?: string | null;
  category?: string | null;
  authorId?: string | null;
  tags?: string[] | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
}

export const CONTACT_BLOCK_KEY = 'contact_sharing_block_enabled';

// ── Tip tanımları ────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  payload: unknown;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogStats {
  totalEntries: number;
  entriesPerDay: { date: string; count: number }[];
  topActions: { action: string; count: number }[];
  topAdmins: { adminUserId: string; adminName: string; count: number }[];
  topTargetTypes: { targetType: string; count: number }[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  budgetMin: number;
  budgetMax: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  customerId: string;
  customer?: { id: string; fullName: string; email: string } | null;
  featuredOrder: number | null;
  photos: string[] | null;
  createdAt: string;
  updatedAt: string;
  // Phase 152 — Yaklaşık konum bayrağı (Voldi-db backfill yazar).
  // `locationApprox=true` → koordinat şehir merkezinden türetilmiş, harita
  // pin'i yarı saydam + "~" rozeti ile gösterilir.
  locationApprox?: boolean | null;
  locationSource?: 'user-pin' | 'city-centroid' | 'geocode' | string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  userId: string;
  businessName: string;
  bio: string;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  hasCertificate: boolean;
  featuredOrder: number | null;
  documents: Record<string, string> | null;
  /** Airtasker-style rozetler (manuel + computed birleşik) — backend'ten döner */
  badges?: string[];
  /** Tasker yeteneklerini gruplar — workerCategories yanında granular tag'ler */
  workerSkills?: string[];
  workerCategories?: string[];
  user?: { id: string; fullName: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  body: string;
  emoji: string | null;
  imageUrl: string | null;
  gradientStart: string;
  gradientEnd: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  minSpend: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  description: string | null;
  appliesTo: 'tokens' | 'offer' | 'all';
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueItem {
  id: string;
  type: 'job' | 'review' | 'chat';
  content: string;
  flagReason: string | null;
  fraudScore: number | null;
  createdAt: string;
  userId: string | null;
  userName: string | null;
}

export interface ModerationQueueResponse {
  data: ModerationQueueItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FlaggedItem {
  type: 'chat' | 'question';
  id: string;
  text: string;
  flagReason: string | null;
  userId: string;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  adminNote: string | null;
  createdAt: string;
}

export interface DisputeAiAnalysis {
  fairnessScore: number;
  fraudRisk: 'low' | 'medium' | 'high';
  suggestedAction: 'refund' | 'partial_refund' | 'cancel' | 'dismiss' | 'escalate';
  reasoning: string;
  analyzedAt: string;
}

export interface AdminDispute {
  id: string;
  jobId: string | null;
  bookingId: string | null;
  raisedBy: string;
  againstUserId: string;
  type: 'quality' | 'payment' | 'no_show' | 'fraud' | 'other';
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  resolution: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  aiAnalysis: DisputeAiAnalysis | null;
  createdAt: string;
}

export interface AdminDisputesResponse {
  data: AdminDispute[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  identityVerified?: boolean;
  role: string;
  createdAt: string;
  suspended?: boolean;
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  manualBadges?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  tokenBalance?: number;
}

export interface BulkVerifyResult {
  updated: number;
  notFound: string[];
  requestedSegment: 'verify' | 'unverify';
}

export interface BulkFeatureResult {
  updated: number;
  notFound: string[];
  featuredOrder?: 1 | 2 | 3 | null;
}

// Phase 162: Chat & Messaging types
export interface ChatMessageDto {
  id: string;
  from: string;
  to: string;
  message: string;
  jobLeadId?: string | null;
  jobId?: string | null;
  bookingId?: string | null;
  deliveryStatus: 'sent' | 'delivered' | 'failed';
  readAt?: string | null;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'document' | 'audio' | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
}

export interface ConversationItemDto {
  peerId: string;
  peerName: string | null;
  peerAvatarUrl: string | null;
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    fromMe: boolean;
    jobLeadId?: string | null;
  };
  unreadCount: number;
  peerOnline: boolean;
  peerLastSeenAt: string | null;
}

// ─── Analytics ────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalLeads: number;
  activeLeads: number;
  totalWorkers: number;
  totalCustomers: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  leadConversionRate: number;
}

export interface WorkerAnalytics {
  workerId: string;
  workerName: string;
  totalBookings: number;
  completedBookings: number;
  successRate: number;
  averageResponseTime: number;
  totalEarnings: number;
  averageRating: number;
}

export interface LeadAnalytics {
  totalLeads: number;
  openLeads: number;
  inProgressLeads: number;
  closedLeads: number;
  expiredLeads: number;
  conversionRate: number;
  averageResponseCount: number;
  topCategories: Array<{ category: string; count: number }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    bookingCount: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
  }>;
  averageTransactionValue: number;
}

export const analyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    return request<AnalyticsOverview>('/analytics/overview');
  },
  async workers(workerId?: string): Promise<WorkerAnalytics[]> {
    const qs = workerId ? `?workerId=${encodeURIComponent(workerId)}` : '';
    return request<WorkerAnalytics[]>(`/analytics/workers${qs}`);
  },
  async leads(): Promise<LeadAnalytics> {
    return request<LeadAnalytics>('/analytics/leads');
  },
  async revenue(): Promise<RevenueAnalytics> {
    return request<RevenueAnalytics>('/analytics/revenue');
  },
};

// ── Phase 213 — Admin Analytics Overview ─────────────────────────────────────
export interface AdminAnalyticsOverview {
  dailyRegistrations: Array<{ date: string; count: number }>;
  dailyJobs: Array<{ date: string; count: number }>;
  revenueByDay: Array<{ date: string; tokensPurchased: number }>;
  topCategories: Array<{ name: string; jobCount: number }>;
  workersByCity: Array<{ city: string; count: number }>;
}

export const adminAnalytics = {
  overview: () => request<AdminAnalyticsOverview>('/admin/analytics/overview'),
};

// ── APK App Config types (Voldi-design+fs) ─────────────────────────────────
export interface AppConfigThemeTokens {
  primary?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
  radius?: number;
  font?: string;
  [k: string]: string | number | undefined;
}

export interface AppConfigTheme {
  id: string;
  name: string;
  tokens: AppConfigThemeTokens;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppConfigBranding {
  logoUrl?: string | null;
  iconUrl?: string | null;
  splashUrl?: string | null;
  appTitle?: string | null;
}

export interface AppConfigSetting {
  key: string;
  value: unknown;
  type?: 'string' | 'number' | 'boolean' | 'json';
  group?: string | null;
  updatedAt?: string;
}

export interface AppConfigLayoutItem {
  key: string;
  visible: boolean;
  props?: Record<string, unknown>;
}

export interface AppConfigLayout {
  screen: string;
  items: AppConfigLayoutItem[];
}

export interface AppConfigVisibilityRule {
  moduleKey: string;
  roles?: string[];      // ["customer", "worker"]
  devices?: string[];    // ["ios", "android", "web"]
  startsAt?: string | null;
  endsAt?: string | null;
  enabled?: boolean;
}

/** Public preview payload — what /app-config returns to the live mobile app. */
export interface AppConfigPublic {
  branding: AppConfigBranding;
  theme: AppConfigThemeTokens;
  settings: Record<string, unknown>;
  layouts: AppConfigLayout[];
}

/** Admin aggregate — full state for the management UI. */
export interface AdminAppConfig {
  branding: AppConfigBranding;
  themes: AppConfigTheme[];
  settings: AppConfigSetting[];
  layouts: AppConfigLayout[];
  visibility: AppConfigVisibilityRule[];
}

/** Phase 276 — All-Pages Registry entry. */
export interface AppScreen {
  key: string;
  name: string;
  description?: string | null;
  iconName?: string | null;
  category?: string | null;
  visible: boolean;
  sortOrder: number;
  previewImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
