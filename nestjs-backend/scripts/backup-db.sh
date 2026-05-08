#!/bin/bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)
FILENAME="yapgitsin_${TS}.sql.gz"
pg_dump "${DATABASE_URL}" | gzip > "/tmp/${FILENAME}"
# Upload to S3/R2
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  aws s3 cp "/tmp/${FILENAME}" "s3://${BACKUP_S3_BUCKET}/db/${FILENAME}"
  rm "/tmp/${FILENAME}"
fi
echo "Backup: ${FILENAME}"
