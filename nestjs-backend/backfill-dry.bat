@echo off
REM Phase 184: Plesk Node.js panel "Run script" dropdown'ı package.json cache'lediği
REM için backfill:coords:dry görünmüyorsa bu .bat doğrudan node ile çalıştırır.
REM Çalıştırma yolu: D:\backend\backfill-dry.bat (deploy sonrası kopyalanmalı)
cd /d %~dp0
echo === Backfill Coords (DRY RUN) ===
node scripts/backfill-coords.js
echo.
echo === Bitti ===
pause
