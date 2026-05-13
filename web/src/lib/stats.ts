// Phase 176 — Public marketplace stats fetcher (build-time, graceful)
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.yapgitsin.tr';

export type PublicStats = {
  workers: number;
  completedJobs: number;
  cities: number;
  successRate: number;
};

export async function getPublicStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API}/stats/public`, {
      next: { revalidate: 300 },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<PublicStats>;
    if (
      typeof data.workers !== 'number' ||
      typeof data.completedJobs !== 'number' ||
      typeof data.cities !== 'number' ||
      typeof data.successRate !== 'number'
    ) {
      return null;
    }
    return data as PublicStats;
  } catch {
    return null;
  }
}
