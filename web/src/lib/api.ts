// API wrapper for public web — server-side fetch with ISR caching
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.yapgitsin.tr';

// Phase 97 — Sitemap tier classification (priority/changefreq tuning).
// Tier 1 = highest commercial intent (priority 0.9 cat / 0.7 cat-city).
// Tier 2 = moderate (0.8 / 0.6). Anything else falls back to default.
export const TIER_1_CATEGORIES = [
  'temizlik',
  'tesisat',
  'elektrikci',
  'klima-isitma',
  'mobilya-montaj',
];
export const TIER_2_CATEGORIES = [
  'boya-badana',
  'nakliyat',
  'bahce-peyzaj',
  'cilingir-kilit',
  'haserekontrolu',
  'cati-yalitim',
  'zemin-parke',
  'marangoz-ahsap',
];

type FetchOpts = { revalidate?: number; cache?: RequestCache };

async function api<T>(path: string, opts: FetchOpts = {}): Promise<T | null> {
  const { revalidate = 3600, cache } = opts;
  try {
    const res = await fetch(`${API}${path}`, {
      ...(cache ? { cache } : { next: { revalidate } }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Category = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  group?: string;
  subServices?: string[];
  avgPriceMin?: number;
  avgPriceMax?: number;
};

export type Worker = {
  id: string;
  fullName: string;
  profileImageUrl?: string;
  city?: string;
  district?: string;
  workerCategories?: string[];
  workerBio?: string;
  averageRating?: number;
  totalReviews?: number;
  reputationScore?: number;
  identityVerified?: boolean;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  isAvailable?: boolean;
  introVideoUrl?: string;
  introVideoDuration?: number;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budgetMin?: number;
  budgetMax?: number;
  status: string;
  customerId: string;
  customer?: { id: string; fullName: string; profileImageUrl?: string };
  photos?: string[];
  createdAt: string;
};

export type Paginated<T> = { data: T[]; total: number; page: number; limit: number; pages: number };

export const getCategories = () => api<Category[]>('/categories');
export const getCategory = (id: string) => api<Category>(`/categories/${id}`);
export const getWorkers = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api<Worker[] | Paginated<Worker>>(`/users/workers${qs ? `?${qs}` : ''}`);
};
export const getWorker = (id: string) => api<any>(`/users/${id}/profile`);
// Phase 133 — public customer profile (no worker fields)
export const getCustomer = (id: string) => api<any>(`/users/${id}/customer-profile`);
export const getJobs = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api<Paginated<Job> | Job[]>(`/jobs${qs ? `?${qs}` : ''}`);
};
export const getJob = (id: string) => api<Job>(`/jobs/${id}`);

// Phase 158 — Blog
export type BlogPost = {
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
};
export const getBlogPosts = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api<Paginated<BlogPost>>(`/blog${qs ? `?${qs}` : ''}`);
};
export const getBlogPost = (slug: string) => api<BlogPost>(`/blog/${slug}`);

export function unwrap<T>(r: T[] | Paginated<T> | null): T[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  return r.data ?? [];
}

// Fallback category slugs used when the backend is unreachable at build time.
// Mirrors the seed list in CategoriesService.onModuleInit (29 kategoriler).
export const FALLBACK_CATEGORY_SLUGS = [
  'temizlik', 'boya-badana', 'bahce-peyzaj', 'nakliyat', 'mobilya-montaj',
  'hasere-kontrolu', 'havuz-spa', 'cilingir-kilit', 'elektrikci', 'tesisat',
  'klima-isitma', 'zemin-parke', 'cati-yalitim', 'marangoz-ahsap',
  'cam-dograma', 'alcipan-asma-tavan', 'guvenlik-sistemleri',
  'bilgisayar-it', 'grafik-tasarim', 'web-yazilim', 'fotograf-video',
  'dugun-organizasyon', 'ozel-ders-egitim', 'saglik-guzellik', 'evcil-hayvan',
  'arac-oto-bakim',
];

export const TR_CITIES = [
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Kayseri', 'Mersin', 'Diyarbakir', 'Eskisehir', 'Samsun', 'Trabzon',
];

export function slugify(text: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return text
    .toLowerCase()
    .replace(/[çğıİöşü]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function parseSlugId(slug: string): string {
  // expects "name-uuid" — last 5 segments form uuid
  const parts = slug.split('-');
  if (parts.length < 5) return slug;
  return parts.slice(-5).join('-');
}
