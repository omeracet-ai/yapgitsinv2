'use client';

import { useEffect } from 'react';

/**
 * Sentry browser SDK init — prod-only, env-driven.
 * Static-export friendly: imports SDK lazily inside useEffect so SSG
 * has no Sentry overhead. Skipped entirely without NEXT_PUBLIC_SENTRY_DSN.
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
