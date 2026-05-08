# Backup Scripts

## backup-db.sh

PostgreSQL database backup script. Dumps + gzips the DB and optionally uploads to S3/R2.

### Setup

```bash
chmod +x scripts/backup-db.sh
```

### Required env vars

- `DATABASE_URL` — Postgres connection string (e.g. `postgres://user:pass@host:5432/db`)
- `BACKUP_S3_BUCKET` (optional) — S3/R2 bucket name. If unset, backup stays in `/tmp`.
- AWS credentials — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` (for `aws s3 cp`).

### Cron (daily at 02:00)

```cron
0 2 * * * cd /app/nestjs-backend && DATABASE_URL=... BACKUP_S3_BUCKET=... ./scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### S3 IAM policy (least privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject"],
    "Resource": "arn:aws:s3:::YOUR_BUCKET/db/*"
  }]
}
```

### Retention

Configure lifecycle rule on bucket: e.g. delete after 30 days, or transition to Glacier after 7.

### Restore

```bash
aws s3 cp s3://BUCKET/db/yapgitsin_YYYYMMDD_HHMMSS.sql.gz - | gunzip | psql "$DATABASE_URL"
```
