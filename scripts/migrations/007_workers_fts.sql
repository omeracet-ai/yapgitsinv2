-- Phase 159.2: Create FTS5 virtual table for worker search
-- Indexes: fullName, workerBio, workerCategories (concatenated), city

CREATE VIRTUAL TABLE IF NOT EXISTS workers_fts USING fts5(
  id UNINDEXED,
  fullName,
  workerBio,
  categories,
  city,
  -- Metadata columns (not indexed, used for filtering)
  averageRating UNINDEXED,
  hourlyRateMin UNINDEXED,
  identityVerified UNINDEXED,
  isAvailable UNINDEXED
);

-- Trigger to keep FTS5 index in sync with users table on INSERT
CREATE TRIGGER IF NOT EXISTS workers_fts_insert AFTER INSERT ON users
WHEN NEW.workerCategories IS NOT NULL AND NEW.asWorkerTotal > 0
BEGIN
  INSERT INTO workers_fts(
    id, fullName, workerBio, categories, city,
    averageRating, hourlyRateMin, identityVerified, isAvailable
  ) VALUES (
    NEW.id,
    NEW.fullName,
    COALESCE(NEW.workerBio, ''),
    COALESCE(GROUP_CONCAT(json_each.value, ' '), ''),
    COALESCE(NEW.city, ''),
    NEW.averageRating,
    CAST(COALESCE(NEW.hourlyRateMinMinor, 0) / 100.0 AS FLOAT),
    CAST(NEW.identityVerified AS INTEGER),
    CAST(NEW.isAvailable AS INTEGER)
  )
  FROM json_each(NEW.workerCategories);
END;

-- Trigger to keep FTS5 index in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS workers_fts_update AFTER UPDATE ON users
WHEN NEW.workerCategories IS NOT NULL
BEGIN
  DELETE FROM workers_fts WHERE id = OLD.id;
  INSERT INTO workers_fts(
    id, fullName, workerBio, categories, city,
    averageRating, hourlyRateMin, identityVerified, isAvailable
  ) VALUES (
    NEW.id,
    NEW.fullName,
    COALESCE(NEW.workerBio, ''),
    COALESCE(GROUP_CONCAT(json_each.value, ' '), ''),
    COALESCE(NEW.city, ''),
    NEW.averageRating,
    CAST(COALESCE(NEW.hourlyRateMinMinor, 0) / 100.0 AS FLOAT),
    CAST(NEW.identityVerified AS INTEGER),
    CAST(NEW.isAvailable AS INTEGER)
  )
  FROM json_each(NEW.workerCategories);
END;

-- Trigger to keep FTS5 index in sync on DELETE
CREATE TRIGGER IF NOT EXISTS workers_fts_delete AFTER DELETE ON users
BEGIN
  DELETE FROM workers_fts WHERE id = OLD.id;
END;
