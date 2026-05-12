# Legacy SQLite-era migrations (archived — DO NOT RUN against Postgres)

These 5 migrations were authored against the dev SQLite database and contain
SQLite-flavored DDL (text PKs, `simple-json`/`simple-enum` column types, no
`jsonb`, etc.). They were **never** the source of truth for the dev schema —
dev runs `synchronize:true`, so the schema is derived directly from the entities.

They are kept here for history only. They are intentionally **outside** the
migrations glob (`migrations/*{.ts,.js}` is non-recursive) so neither the
runtime app (`app.module.ts`, `migrationsRun` in prod) nor the TypeORM CLI
(`data-source.ts`) will load or execute them.

## Postgres baseline plan

Per `docs/DB_MIGRATION_RUNBOOK.md` §3: when a real Postgres instance is
available, generate ONE authoritative baseline migration from the current
(now Postgres-clean) entities:

```
cd nestjs-backend
# point .env at an empty local Postgres, DB_TYPE=postgres
npm run migration:generate -- src/migrations/PgBaseline
npm run migration:run
npm run migration:show   # must be clean / zero pending
```

Do **not** try to "fix" these legacy files or run them on Postgres — they will
fail or produce a schema that diverges from the entities. Once the PG baseline
is committed and verified, this folder can be deleted.
