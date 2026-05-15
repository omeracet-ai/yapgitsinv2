@echo off
REM Phase 184: Backfill APPLY — gerçekten DB'ye yazar
cd /d %~dp0
echo === Backfill Coords (APPLY - DB write) ===
node scripts/backfill-coords.js --apply
echo.
echo === Bitti ===
pause
