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

  // Son İlanlar
  recentJobs: (limit = 20) => request<Job[]>(`/admin/jobs?limit=${limit}`),

  // Kullanıcılar
  users: () => request<User[]>('/admin/users'),

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
};

// ── Tip tanımları ────────────────────────────────────────────────────────────

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

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  role: string;
  createdAt: string;
}
