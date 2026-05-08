const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  adminLogin: (username: string, password: string) =>
    request<{ access_token: string; user: AdminUser }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

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

  // Kullanıcılar
  users: () => request<User[]>('/admin/users'),
  bulkVerifyUsers: (userIds: string[], identityVerified: boolean) =>
    request<BulkVerifyResult>('/admin/users/bulk-verify', {
      method: 'POST',
      body: JSON.stringify({ userIds, identityVerified }),
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
  setVerification: (id: string, isVerified: boolean)     =>
    request<Provider>(`/admin/providers/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ isVerified }) }),

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

  // Onboarding slides
  onboardingSlides:       ()                                          => request<OnboardingSlide[]>('/onboarding-slides/all'),
  createOnboardingSlide:  (data: Partial<OnboardingSlide>)           => request<OnboardingSlide>('/onboarding-slides',         { method: 'POST',   body: JSON.stringify(data) }),
  updateOnboardingSlide:  (id: string, data: Partial<OnboardingSlide>) => request<OnboardingSlide>(`/onboarding-slides/${id}`, { method: 'PATCH',  body: JSON.stringify(data) }),
  deleteOnboardingSlide:  (id: string)                               => request<void>(`/onboarding-slides/${id}`,              { method: 'DELETE' }),
  reorderOnboardingSlides:(ids: string[])                            => request<void>('/onboarding-slides/reorder',            { method: 'PATCH',  body: JSON.stringify({ ids }) }),
  uploadOnboardingImage:  (file: File)                               => {
    const fd = new FormData();
    fd.append('image', file);
    return uploadFile<{ url: string }>('/uploads/onboarding-image', fd);
  },

  // Moderation
  flaggedItems:           ()                => request<FlaggedItem[]>('/admin/moderation/flagged'),
  deleteFlaggedChat:      (id: string)      => request<{ id: string; type: string; cleared: boolean }>(`/admin/moderation/chat/${id}`,     { method: 'DELETE' }),
  deleteFlaggedQuestion:  (id: string)      => request<{ id: string; type: string; cleared: boolean }>(`/admin/moderation/question/${id}`, { method: 'DELETE' }),

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

  // Broadcast notifications
  broadcastNotification: (data: { title: string; message: string; segment: 'all' | 'workers' | 'customers' | 'verified_workers' }) =>
    request<{ sent: number; segment: string }>('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

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
  budgetMin: number;
  budgetMax: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  customerId: string;
  customer?: { id: string; fullName: string; email: string } | null;
  featuredOrder: number | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface BulkVerifyResult {
  updated: number;
  notFound: string[];
  requestedSegment: 'verify' | 'unverify';
}
