# PostgreSQL Migration Dry-Run (SQLite → Postgres)

Staging rehearsal for cutting the backend from dev SQLite to production PostgreSQL.
Run this end-to-end on **staging** before touching prod. Goal: zero pending
migrations, working escrow + auth + token flows, with a tested rollback.

> Schema in prod is **migrations-only**. `synchronize` is hard-forced `false`
> whenever `NODE_ENV=production` or `DB_TYPE=postgres` (see `app.module.ts` /
> `data-source.ts`). Never enable `ALLOW_SCHEMA_SYNC` against Postgres.

---

## 1. Snapshot / backup current SQLite

```bash
# From nestjs-backend/
cp hizmet_db.sqlite hizmet_db.backup.$(date +%Y%m%d-%H%M%S).sqlite
```

Keep this backup off-box (copy to your machine / object storage). It is your
ground-truth fallback if the cutover is aborted.

## 2. Point staging at Postgres

Set in the staging `.env` (or `.env.production` on the staging host):

```
NODE_ENV=production
DB_TYPE=postgres
DB_HOST=<staging-pg-host>
DB_PORT=5432
DB_USERNAME=<user>
DB_PASSWORD=<pass>
DB_DATABASE=<dbname>
```

Use a **fresh, empty** Postgres database for the first dry-run.

## 3. Confirm synchronize is OFF

- `DB_TYPE=postgres` and/or `NODE_ENV=production` force `synchronize: false`.
- Do **not** set `ALLOW_SCHEMA_SYNC=true`.
- Sanity check: app boot logs must NOT show TypeORM altering/creating tables
  on their own — only migration execution.

## 4. Run migrations

```bash
npm run build          # ensure dist/migrations compiled
npm run migration:run  # applies all pending migrations to Postgres
```

## 5. Verify zero pending migrations

```bash
npm run migration:check   # runs migration:show, fails if any pending
```

- `[X]` = applied, `[ ]` = pending.
- The check wrapper parses the output and **exits non-zero if any migration is
  pending** (TypeORM's own `migration:show` always exits 0, so the wrapper
  enforces the gate — usable directly in CI/cutover scripts).
- Expected result: all `[X]`, exit code 0. If anything is `[ ]`, stop and
  investigate before going further.

## 6. Smoke test critical flows

Hit staging and confirm each works against Postgres:

1. **Auth / register** — register a new user; verify KVKK consent fields persist
   (consent rows/columns written, not null).
2. **Token transaction** — perform one token spend/purchase; confirm
   `token_transactions` row is created and `tokenBalance` updates correctly.
3. **Escrow create** — create an escrow (booking/job) and confirm the
   `payment_escrows` / `booking_escrows` row.
4. **Escrow release** — release that escrow; confirm status transition and any
   ledger/payout effects land.

Check for: foreign-key violations, enum/`simple-enum` mismatches, decimal/float
rounding differences vs SQLite.

## 7. Rollback plan

If any step fails:

1. **Stop** the staging app pointed at Postgres.
2. Revert env back to SQLite:
   ```
   DB_TYPE=sqlite
   # unset NODE_ENV=production for local, or restore prior values
   ```
   and restore the SQLite backup from step 1 if it was mutated.
3. To undo the last migration on Postgres:
   ```bash
   npm run migration:revert   # repeat per migration to roll back
   ```
   Or simply **drop and recreate** the staging Postgres DB (it was empty at
   start) and redo from step 2 after fixing the migration.
4. Re-run `npm run migration:check` after rollback to confirm a clean state.

---

### Quick reference

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TS + migrations to `dist/` |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:check` | Status + **non-zero exit if pending** (CI gate) |
| `npm run migration:show` | Show status (no exit-code gate) |
| `npm run migration:revert` | Roll back the most recent migration |
