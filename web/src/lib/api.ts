// API wrapper for public web — server-side fetch with ISR caching
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
export const getJobs = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api<Paginated<Job> | Job[]>(`/jobs${qs ? `?${qs}` : ''}`);
};
export const getJob = (id: string) => api<Job>(`/jobs/${id}`);

export function unwrap<T>(r: T[] | Paginated<T> | null): T[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  return r.data ?? [];
}

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
