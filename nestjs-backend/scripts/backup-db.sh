#!/bin/bash
# P222 — SQLite backup with WAL checkpoint + atomic .backup + gzip + rotation.
# Usage:
#   DB_PATH=/path/to/hizmet_db.sqlite BACKUP_DIR=/var/backups ./backup-db.sh
# Defaults:
#   DB_PATH=./hizmet_db.sqlite
#   BACKUP_DIR=./backups
#   RETENTION_DAYS=14
set -euo pipefail

DB_PATH="${DB_PATH:-./hizmet_db.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hizmet_db_${TIMESTAMP}.sqlite"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: DB file not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# 1. Flush WAL into the main db file (safe, online).
sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);"

# 2. Online atomic copy via .backup (handles concurrent writers correctly).
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

# 3. Compress.
gzip -9 "$BACKUP_FILE"

# 4. Rotate — keep last N days.
find "$BACKUP_DIR" -name "hizmet_db_*.sqlite.gz" -mtime "+${RETENTION_DAYS}" -delete

# 5. Optional S3/R2 upload (only if env set).
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  aws s3 cp "${BACKUP_FILE}.gz" "s3://${BACKUP_S3_BUCKET}/db/hizmet_db_${TIMESTAMP}.sqlite.gz"
fi

echo "Backup: ${BACKUP_FILE}.gz"
