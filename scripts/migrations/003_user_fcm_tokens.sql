-- Phase 171: user fcm tokens column for FCM push notification multi-device support
-- Idempotent: safe to re-run.
-- Backs the User.fcmTokens (simple-json) and User.pushNotificationsEnabled fields.
--
-- SQLite (dev): TypeORM synchronize:true already handles schema drift; this is
-- only required for managed databases (MySQL/Postgres) where synchronize is off.

-- MySQL syntax (production):
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fcmTokens TEXT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pushNotificationsEnabled TINYINT(1) NOT NULL DEFAULT 1;

-- Postgres equivalent (run manually if DB_TYPE=postgres):
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS "fcmTokens" TEXT NULL;
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE;
