type PlausibleFn = (name: string, options?: { props?: Record<string, string | number> }) => void;

export function trackEvent(name: string, props?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  const fn = (window as unknown as { plausible?: PlausibleFn }).plausible;
  if (typeof fn === 'function') {
    fn(name, props ? { props } : undefined);
  }
}
