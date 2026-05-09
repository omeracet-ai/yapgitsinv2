-- Phase 177 — Geohash columns + indexes for fast proximity queries
-- Speedup: O(n) JS Haversine scan -> O(log n) prefix index + O(k) equirectangular
-- Precision 6 (~1.2km cells); query at precision 5 (~5km) with 9-cell neighborhood.

-- users: home location geohash
ALTER TABLE users ADD COLUMN homeGeohash VARCHAR(12) NULL;
CREATE INDEX IF NOT EXISTS idx_users_home_geohash ON users(homeGeohash);

-- jobs: listing geohash (latitude/longitude already exist)
ALTER TABLE jobs ADD COLUMN geohash VARCHAR(12) NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_geohash ON jobs(geohash);

-- service_requests: listing geohash
ALTER TABLE service_requests ADD COLUMN geohash VARCHAR(12) NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_geohash ON service_requests(geohash);

-- Backfill existing rows (geohash precision 6).
-- NOTE: SQLite has no native geohash function; backfill is done by the
-- NestJS migration runner (scripts/migrate-prod.js) which calls
-- encodeGeohash() in JS for every row with non-null lat/lon.
