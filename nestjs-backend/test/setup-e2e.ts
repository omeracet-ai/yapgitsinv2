// E2E test bootstrap — runs before any module import (jest-e2e.json setupFiles).
// Forces an isolated in-memory SQLite DB so e2e tests never touch the real dev/prod DB.
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
process.env.DB_DATABASE = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
// AuthService.onModuleInit auto-seeds an admin (admin@yapgitsin.tr) with this password.
process.env.ADMIN_INITIAL_PASSWORD = 'admin';
// Quiet down outbound integrations (SMS/email just log-and-skip without creds).
delete process.env.NETGSM_USER;
delete process.env.SENTRY_DSN;
