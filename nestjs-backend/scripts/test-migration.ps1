<#
.SYNOPSIS
  Phase 255 — Migration test harness for AddSoftDeleteAndTokenVersion.

.DESCRIPTION
  Verifies the Phase 255 migration (`1748000000000-AddSoftDeleteAndTokenVersion`)
  is reversible and idempotent against a SQLite snapshot of the dev DB.

  Sequence:
    1. Backup hizmet_db.sqlite -> hizmet_db.sqlite.bak.<timestamp>
    2. Run migration   (npm run typeorm migration:run)
    3. Assert columns  (users.deletedAt, users.tokenVersion exist)
    4. Revert migration (npm run typeorm migration:revert)
    5. Assert columns gone
    6. Run migration again (idempotency / re-apply)
    7. Assert columns back
    8. Restore-or-keep depending on -KeepDb switch

.PARAMETER KeepDb
  If set, leaves the DB in the migrated state. Otherwise restores backup.

.PARAMETER MigrationName
  Override the migration class name (default: AddSoftDeleteAndTokenVersion).

.NOTES
  Voldi-db is authoring 1748000000000-AddSoftDeleteAndTokenVersion.ts in parallel.
  This script assumes that filename — adjust -MigrationFile if it lands different.
#>

[CmdletBinding()]
param(
  [switch]$KeepDb,
  [string]$MigrationName = 'AddSoftDeleteAndTokenVersion',
  [string]$MigrationFile = '1748000000000-AddSoftDeleteAndTokenVersion.ts',
  [string[]]$ExpectedColumns = @('deletedAt', 'tokenVersion'),
  [string]$TargetTable = 'users'
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = Split-Path -Parent $ScriptRoot
$DbPath = Join-Path $BackendRoot 'hizmet_db.sqlite'
$MigrationPath = Join-Path $BackendRoot ("src/migrations/" + $MigrationFile)

function Write-Section([string]$msg) {
  Write-Host ""
  Write-Host ("=" * 70) -ForegroundColor Cyan
  Write-Host $msg -ForegroundColor Cyan
  Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Assert-True([bool]$cond, [string]$msg) {
  if (-not $cond) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    throw $msg
  }
  Write-Host "[OK]   $msg" -ForegroundColor Green
}

function Get-UserColumns {
  # Uses sqlite3 CLI if present; otherwise falls back to node one-liner.
  if (Get-Command sqlite3 -ErrorAction SilentlyContinue) {
    return (& sqlite3 $DbPath "PRAGMA table_info($TargetTable);") `
      | ForEach-Object { ($_ -split '\|')[1] }
  }
  # Node fallback — assumes better-sqlite3 is installed in backend.
  Push-Location $BackendRoot
  try {
    $js = @"
const Database = require('better-sqlite3');
const db = new Database('hizmet_db.sqlite', { readonly: true });
const rows = db.prepare("PRAGMA table_info($TargetTable)").all();
console.log(rows.map(r => r.name).join('\n'));
"@
    return (node -e $js) -split "`r?`n" | Where-Object { $_ -ne '' }
  } finally {
    Pop-Location
  }
}

Write-Section "Phase 255 migration harness — $MigrationName"

# --- Pre-flight ---
Assert-True (Test-Path $DbPath) "SQLite DB exists at $DbPath"
if (-not (Test-Path $MigrationPath)) {
  Write-Host "[WARN] Migration file not yet authored: $MigrationPath" -ForegroundColor Yellow
  Write-Host "       Voldi-db is producing this in parallel. Re-run after it lands." -ForegroundColor Yellow
  exit 2
}

# --- 1. Backup ---
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup = "$DbPath.bak.$stamp"
Copy-Item $DbPath $Backup -Force
Assert-True (Test-Path $Backup) "Backup created: $Backup"

try {
  Push-Location $BackendRoot

  # --- 2. Run migration ---
  Write-Section "Step 2/6 — migration:run"
  npm run typeorm -- migration:run -d src/data-source.ts
  if ($LASTEXITCODE -ne 0) { throw "migration:run failed (exit $LASTEXITCODE)" }

  # --- 3. Assert columns present ---
  Write-Section "Step 3/6 — assert columns exist"
  $cols = Get-UserColumns
  foreach ($c in $ExpectedColumns) {
    Assert-True ($cols -contains $c) "$TargetTable.$c present after migration:run"
  }

  # --- 4. Revert ---
  Write-Section "Step 4/6 — migration:revert"
  npm run typeorm -- migration:revert -d src/data-source.ts
  if ($LASTEXITCODE -ne 0) { throw "migration:revert failed (exit $LASTEXITCODE)" }

  $cols = Get-UserColumns
  foreach ($c in $ExpectedColumns) {
    Assert-True (-not ($cols -contains $c)) "$TargetTable.$c removed after revert"
  }

  # --- 5. Re-apply (idempotency) ---
  Write-Section "Step 5/6 — migration:run (re-apply)"
  npm run typeorm -- migration:run -d src/data-source.ts
  if ($LASTEXITCODE -ne 0) { throw "second migration:run failed (exit $LASTEXITCODE)" }

  $cols = Get-UserColumns
  foreach ($c in $ExpectedColumns) {
    Assert-True ($cols -contains $c) "$TargetTable.$c present after re-apply"
  }

  Write-Section "Step 6/6 — PASS"
  Write-Host "All migration assertions passed." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "[ABORT] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Restoring DB from backup..." -ForegroundColor Yellow
  Copy-Item $Backup $DbPath -Force
  Write-Host "Restored. Backup retained at $Backup" -ForegroundColor Yellow
  exit 1
}
finally {
  Pop-Location
}

# --- Restore unless -KeepDb ---
if (-not $KeepDb) {
  Copy-Item $Backup $DbPath -Force
  Write-Host "DB restored from backup (use -KeepDb to retain migrated state)." -ForegroundColor Yellow
} else {
  Write-Host "DB left in migrated state. Backup at $Backup" -ForegroundColor Yellow
}
