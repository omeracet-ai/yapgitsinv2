<#
.SYNOPSIS
  Phase 258 - Patch the Next.js standalone server.js so it tolerates the
  iisnode named-pipe PORT.

.DESCRIPTION
  Plesk/IIS runs the Next.js standalone app under iisnode. iisnode does NOT pass
  a numeric port in process.env.PORT - it passes a Windows named pipe string such
  as "\\.\pipe\1a2b3c-...". Next.js standalone's generated server.js reads the port
  with:

      const currentPort = parseInt(process.env.PORT, 10) || 3000

  parseInt() on a pipe string returns NaN, falls back to 3000, and the app then
  listens on TCP :3000 instead of the pipe iisnode handed it - so IIS can never
  reach the worker and every request 500s.

  This script rewrites that line so a non-numeric PORT (a pipe / any string that
  isn't a clean number) is passed through to listen() AS-IS, while a numeric PORT
  still parses to an int (local `next start`, container hosting, etc.).

  Idempotent: guarded by a marker comment + the patched-token check, so running it
  twice (or after build already patched it via postbuild-iis.js) is a safe no-op.

.PARAMETER ServerJs
  Path to the standalone server.js. Defaults to ../dist/standalone/server.js
  (next.config.ts uses distDir: "dist", output: "standalone").

.EXAMPLE
  pwsh admin-panel/scripts/patch-nextjs-iisnode.ps1
  pwsh admin-panel/scripts/patch-nextjs-iisnode.ps1 -ServerJs D:\admin\server.js
#>
[CmdletBinding()]
param(
    [string]$ServerJs
)

$ErrorActionPreference = 'Stop'

if (-not $ServerJs) {
    $ServerJs = Join-Path $PSScriptRoot '..\dist\standalone\server.js'
}

# Marker comment written into server.js so re-runs are detected even if Next
# changes the surrounding code shape between versions.
$marker = '/* iisnode-pipe-port-patch (Phase 258) */'

if (-not (Test-Path -LiteralPath $ServerJs)) {
    Write-Host "patch-nextjs-iisnode: server.js not found at $ServerJs - nothing to patch (run after 'next build')." -ForegroundColor Yellow
    # Not an error: lets the npm 'postbuild' hook no-op gracefully when there is
    # no standalone output (e.g. a non-standalone or skipped build).
    exit 0
}

$src = Get-Content -LiteralPath $ServerJs -Raw

# Idempotency guard: marker present OR the JS postbuild already applied the same
# shim (it injects `isNaN(Number(rawPort))`). Either way, do not patch again.
if ($src.Contains($marker) -or $src.Contains('isNaN(Number(rawPort))')) {
    Write-Host "patch-nextjs-iisnode: already patched - no-op." -ForegroundColor DarkGray
    exit 0
}

$needle = 'const currentPort = parseInt(process.env.PORT, 10) || 3000'

# Literal (single-quoted) here-string - no PowerShell interpolation, so the JS
# backslashes / $-tokens stay verbatim. __MARKER__ is substituted afterwards.
$replacementTemplate = @'
__MARKER__
const rawPort = process.env.PORT
// iisnode hands PORT as a Windows named pipe (e.g. \\.\pipe\xxxx) or any
// non-numeric string; pass it straight to listen(). Numeric PORT still parses.
const currentPort = (rawPort && isNaN(Number(rawPort))) ? rawPort : (parseInt(rawPort, 10) || 3000)
'@
$replacement = $replacementTemplate.Replace('__MARKER__', $marker)

if (-not $src.Contains($needle)) {
    Write-Host "patch-nextjs-iisnode: expected PORT line not found in $ServerJs." -ForegroundColor Red
    Write-Host "  Next.js standalone server.js shape changed - inspect manually before deploying to IIS." -ForegroundColor Red
    Write-Host "  Looked for: $needle" -ForegroundColor Red
    exit 1
}

$patched = $src.Replace($needle, $replacement)
# Preserve original (LF) line endings; write without BOM so Node parses cleanly.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $ServerJs), $patched, $utf8NoBom)

Write-Host "patch-nextjs-iisnode: applied iisnode pipe-PORT patch to $ServerJs" -ForegroundColor Green
exit 0
