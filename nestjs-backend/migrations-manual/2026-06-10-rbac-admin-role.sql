-- Phase 489 (Faz J/2) — RBAC enforcement
-- Add adminRole sub-role column to users table for fine-grained admin permissions.
-- Backward compatible: existing admins have NULL → treated as super_admin in code
-- (see resolveRbacRole in src/common/rbac/rbac.config.ts).
--
-- Allowed values (varchar, validated in code, no DB constraint to keep SQLite simple):
--   super_admin | admin | moderator | content_editor | analyst
--
-- Run once on prod SQLite after deploying this commit.

ALTER TABLE users ADD COLUMN adminRole VARCHAR(32);
