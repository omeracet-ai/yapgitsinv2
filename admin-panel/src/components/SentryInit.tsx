'use client';

import { useEffect } from 'react';

/**
 * Sentry browser SDK init — prod-only, env-driven.
 * Lazy-imports SDK in useEffect so SSR/build is unaffected.
 */
export default function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    if (process.env.NODE_ENV !== 'production') return;
    void import('@sentry/browser').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      });
    });
  }, []);
  return null;
}
