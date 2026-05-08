# Migrations

TypeORM migration infrastructure for the NestJS backend.

## Mental model

- **Development** → `synchronize: true`. Entity changes auto-apply to your local SQLite DB. No migrations needed for day-to-day work.
- **Production** → `synchronize: false`, `migrationsRun: true`. Schema changes ship as committed migration files and run automatically on deploy.

`NODE_ENV=production` flips both behaviors in `app.module.ts`.

## Workflow

### Generate a migration from entity changes
After editing entities, with a DB matching the previous schema available:
```bash
npm run migration:generate -- src/migrations/AddUserField
```
Commit the generated file.

### Create an empty migration (manual SQL)
```bash
npm run migration:create -- src/migrations/CustomDataFix
```

### Run pending migrations
```bash
npm run migration:run
```
(Production runs this automatically via `migrationsRun: true`.)

### Revert the most recent migration
```bash
npm run migration:revert
```

### Show status
```bash
npm run migration:show
```

## Notes

- The CLI uses `src/data-source.ts`, which reads the same `.env` as the app.
- Entity path glob covers both `.ts` (CLI) and `.js` (prod runtime).
- The included `1700000000000-Init.ts` is a placeholder. For a real production DB, generate the true init migration against an empty target DB and replace the stub (see file header).
