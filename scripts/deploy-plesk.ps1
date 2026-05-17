<#
.SYNOPSIS
  Yapgitsin Plesk module-aware FTP deploy + smoke runner.

.DESCRIPTION
  feedback_ftp_deploy_default kurali: bu script OTOMATIK tetiklenmez, kullanici
  dogrudan calistir. Module-bazli dosya gonderir, opsiyonel tmp/restart.txt ile
  Passenger restart tetikler, deploy sonrasi sabit smoke endpoint testleri kosar.

.PARAMETER Mode
  dry-run | live | smoke | help

.PARAMETER Module
  reviews | categories | auth | iyzico | jobs | full
  (Get-ModuleMap icinde genisletilebilir.)

.PARAMETER NoRestart
  tmp/restart.txt upload'unu atlar (manuel restart gerekir).

.PARAMETER NoSmoke
  Deploy sonrasi smoke testlerini atlar.

.PARAMETER EnvFile
  Default: <repo>/.env.deploy

.EXAMPLE
  pwsh scripts/deploy-plesk.ps1 dry-run categories
  pwsh scripts/deploy-plesk.ps1 live categories
  pwsh scripts/deploy-plesk.ps1 smoke
  pwsh scripts/deploy-plesk.ps1 live full -NoRestart
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('dry-run','live','smoke','help')]
    [string]$Mode,

    [Parameter(Position=1)]
    [string]$Module,

    [string]$EnvFile,
    [switch]$NoRestart,
    [switch]$NoSmoke
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) { $EnvFile = Join-Path $RepoRoot '.env.deploy' }

# ---------------------------------------------------------------------------
# Module map: local path (repo-relative) -> remote path (under FTP_REMOTE_DIR)
#   Smoke: "METHOD /path:EXPECTED_STATUS" — birden fazlasi virgulle ayrilir.
#   feedback_prod_deploy_path: prod Plesk startup = src/main.js, dist/ DEGIL.
# ---------------------------------------------------------------------------
function Get-ModuleMap {
    @{
        'reviews'    = @{
            Local  = 'nestjs-backend/src/modules/reviews'
            Remote = '/backend/src/modules/reviews'
            Smoke  = @('GET /healthz:200','GET /reviews/recent:200')
        }
        'categories' = @{
            Local  = 'nestjs-backend/src/modules/categories'
            Remote = '/backend/src/modules/categories'
            Smoke  = @('GET /healthz:200','GET /categories:200','GET /categories/tree:200')
        }
        'auth'       = @{
            Local  = 'nestjs-backend/src/modules/auth'
            Remote = '/backend/src/modules/auth'
            Smoke  = @('GET /healthz:200','POST /auth/sms/verify:400','POST /auth/firebase:400')
        }
        'iyzico'     = @{
            Local  = 'nestjs-backend/src/modules/iyzico'
            Remote = '/backend/src/modules/iyzico'
            Smoke  = @('GET /healthz:200')
        }
        'jobs'       = @{
            Local  = 'nestjs-backend/src/modules/jobs'
            Remote = '/backend/src/modules/jobs'
            Smoke  = @('GET /healthz:200','GET /jobs:200')
        }
        'full'       = @{
            Local  = 'nestjs-backend/src'
            Remote = '/backend/src'
            Smoke  = @('GET /healthz:200','GET /reviews/recent:200','GET /categories/tree:200')
        }
    }
}

function Show-Help {
    Write-Host @"
Yapgitsin Plesk Deploy
======================

Usage:
  pwsh scripts/deploy-plesk.ps1 <mode> [module] [-NoRestart] [-NoSmoke]

Modes:
  dry-run <module>   Hangi dosyalar hangi remote path'e gidecek listeler. Upload YAPMAZ.
  live    <module>   FTP upload + (opsiyonel) tmp/restart.txt + smoke.
  smoke              Sadece sabit smoke endpoint testlerini kosar (module gerektirmez).
  help               Bu mesaj.

Modules: reviews | categories | auth | iyzico | jobs | full

.env.deploy gereken alanlar:
  FTP_HOST, FTP_USER, FTP_PASS, FTP_PORT (default 21), FTP_REMOTE_DIR (default /httpdocs),
  FTP_USE_TLS (1=FTPS, 0=plain), SMOKE_BASE (default https://api.yapgitsin.tr)

Notlar:
- Memory feedback_post_deploy_smoke: deploy sonrasi smoke SART. Bu script otomatik kosturur.
- Memory feedback_prod_deploy_path: kaynak src/ altina yuklenir, dist/ DEGIL.
- Plesk Passenger restart: tmp/restart.txt mtime degisince auto-restart. -NoRestart ile bypass.
"@ -ForegroundColor Cyan
}

# ---------------------------------------------------------------------------
function Read-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        throw ".env.deploy bulunamadi: $EnvFile`nOrnek: scripts/.env.deploy ya da .env.deploy.example bakin."
    }
    $map = @{}
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('#')) { continue }
        if ($t -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
            $key = $Matches[1]
            $val = $Matches[2].Trim().Trim('"').Trim("'")
            $map[$key] = $val
        }
    }
    return $map
}

function Get-Config {
    $env = Read-EnvFile
    foreach ($req in @('FTP_HOST','FTP_USER','FTP_PASS')) {
        if (-not $env[$req]) { throw "$req .env.deploy'da eksik." }
    }
    return [pscustomobject]@{
        Host       = $env['FTP_HOST']
        User       = $env['FTP_USER']
        Pass       = $env['FTP_PASS']
        Port       = if ($env['FTP_PORT']) { $env['FTP_PORT'] } else { '21' }
        RemoteRoot = if ($env['FTP_REMOTE_DIR']) { $env['FTP_REMOTE_DIR'].TrimEnd('/') } else { '/httpdocs' }
        UseTls     = ($env['FTP_USE_TLS'] -eq '1')
        SmokeBase  = if ($env['SMOKE_BASE']) { $env['SMOKE_BASE'].TrimEnd('/') } else { 'https://api.yapgitsin.tr' }
    }
}

# ---------------------------------------------------------------------------
function Get-ModuleSpec {
    param([string]$Name)
    $map = Get-ModuleMap
    if (-not $Name -or -not $map.ContainsKey($Name)) {
        throw "Module gerekli. Gecerli: $($map.Keys -join ', ')"
    }
    $spec = $map[$Name]
    $localFull = Join-Path $RepoRoot $spec.Local
    if (-not (Test-Path $localFull)) {
        throw "Local path yok: $localFull"
    }
    return [pscustomobject]@{
        Name       = $Name
        LocalRoot  = (Resolve-Path $localFull).Path
        RemoteSub  = $spec.Remote
        SmokeSpecs = $spec.Smoke
    }
}

function Get-DeployFiles {
    param([string]$LocalRoot)
    # node_modules, dist, test, *.spec.ts, .map, .DS_Store gibi seyler haric
    $excludePatterns = @(
        '*\node_modules\*','*\dist\*','*\.git\*','*\coverage\*','*\__tests__\*',
        '*.spec.ts','*.test.ts','*.map','*.log','.DS_Store','Thumbs.db'
    )
    Get-ChildItem -LiteralPath $LocalRoot -Recurse -File | Where-Object {
        $f = $_.FullName
        foreach ($p in $excludePatterns) { if ($f -like $p) { return $false } }
        return $true
    }
}

# ---------------------------------------------------------------------------
function Set-TlsAndCallback {
    param($Config)
    try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 } catch {}
    if ($Config.UseTls) {
        # Pin yok — kullanici bu script'i guvenli aginda calistirir.
        # Hostile network paranoyasi icin ftp-upload.ps1'deki thumbprint pin patternini kullan.
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    }
}

function New-FtpRequest {
    param($Uri, $Method, $Config)
    $req = [System.Net.FtpWebRequest]::Create($Uri)
    $req.Method = $Method
    $req.Credentials = New-Object System.Net.NetworkCredential($Config.User, $Config.Pass)
    $req.UseBinary = $true
    $req.UsePassive = $true
    $req.KeepAlive = $false
    $req.EnableSsl = $Config.UseTls
    return $req
}

function Ensure-RemoteDir {
    param($RemoteDir, $Config)
    # Adim adim mkdir; varsa exception yutulur.
    $parts = $RemoteDir.Trim('/').Split('/')
    $acc = ''
    foreach ($p in $parts) {
        if (-not $p) { continue }
        $acc = "$acc/$p"
        $uri = "ftp://$($Config.Host):$($Config.Port)$acc"
        try {
            $r = New-FtpRequest -Uri $uri -Method 'MakeDirectory' -Config $Config
            $resp = $r.GetResponse(); $resp.Close()
        } catch {
            # 550 (var) sessizce gec
        }
    }
}

function Send-File {
    param($LocalPath, $RemotePath, $Config)
    $uri = "ftp://$($Config.Host):$($Config.Port)$RemotePath"
    $req = New-FtpRequest -Uri $uri -Method 'UploadFile' -Config $Config
    $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    try {
        $stream.Write($bytes, 0, $bytes.Length)
    } finally {
        $stream.Close()
    }
    $resp = $req.GetResponse()
    $code = $resp.StatusCode
    $resp.Close()
    return $code
}

# ---------------------------------------------------------------------------
function Invoke-DryRun {
    param($Config, $Spec)
    $files = Get-DeployFiles -LocalRoot $Spec.LocalRoot
    Write-Host "DRY-RUN: $($Spec.Name)" -ForegroundColor Yellow
    Write-Host "  Local:  $($Spec.LocalRoot)"
    Write-Host "  Remote: $($Config.RemoteRoot)$($Spec.RemoteSub)"
    Write-Host "  Files:  $($files.Count)`n"
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($Spec.LocalRoot.Length).TrimStart('\','/').Replace('\','/')
        $remote = "$($Config.RemoteRoot)$($Spec.RemoteSub)/$rel"
        Write-Host "  $rel  ->  $remote"
    }
    Write-Host "`nDRY-RUN OK — hicbir dosya yuklenmedi." -ForegroundColor Green
}

function Invoke-Live {
    param($Config, $Spec)
    Set-TlsAndCallback -Config $Config
    $files = Get-DeployFiles -LocalRoot $Spec.LocalRoot
    Write-Host "LIVE deploy: $($Spec.Name) ($($files.Count) dosya) -> ftp://$($Config.Host)$($Config.RemoteRoot)$($Spec.RemoteSub)" -ForegroundColor Magenta

    $remoteDirs = $files | ForEach-Object {
        $rel = $_.FullName.Substring($Spec.LocalRoot.Length).TrimStart('\','/').Replace('\','/')
        $d = Split-Path -Parent $rel
        if ($d) { "$($Config.RemoteRoot)$($Spec.RemoteSub)/$d".Replace('\','/') }
    } | Sort-Object -Unique

    Write-Host "  Remote dizinler hazirlaniyor ($($remoteDirs.Count))..." -ForegroundColor Gray
    Ensure-RemoteDir -RemoteDir "$($Config.RemoteRoot)$($Spec.RemoteSub)" -Config $Config
    foreach ($d in $remoteDirs) { Ensure-RemoteDir -RemoteDir $d -Config $Config }

    $okCount = 0; $failCount = 0
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($Spec.LocalRoot.Length).TrimStart('\','/').Replace('\','/')
        $remote = "$($Config.RemoteRoot)$($Spec.RemoteSub)/$rel"
        try {
            $null = Send-File -LocalPath $f.FullName -RemotePath $remote -Config $Config
            $okCount++
            Write-Host "  ok   $rel" -ForegroundColor DarkGreen
        } catch {
            $failCount++
            Write-Host "  FAIL $rel  ($($_.Exception.Message))" -ForegroundColor Red
        }
    }
    Write-Host "`nUpload: $okCount ok, $failCount fail" -ForegroundColor $(if ($failCount) { 'Red' } else { 'Green' })

    if (-not $NoRestart) {
        Write-Host "`nPassenger restart: tmp/restart.txt touch..." -ForegroundColor Cyan
        $tmpDir = "$($Config.RemoteRoot)/backend/tmp"
        Ensure-RemoteDir -RemoteDir $tmpDir -Config $Config
        $localTmp = [System.IO.Path]::GetTempFileName()
        Set-Content -LiteralPath $localTmp -Value "restart $([DateTime]::UtcNow.ToString('o'))" -NoNewline
        try {
            $null = Send-File -LocalPath $localTmp -RemotePath "$tmpDir/restart.txt" -Config $Config
            Write-Host "  ok  tmp/restart.txt yenilendi" -ForegroundColor Green
        } catch {
            Write-Host "  FAIL tmp/restart.txt — manuel Plesk restart gerek" -ForegroundColor Red
        } finally {
            Remove-Item -LiteralPath $localTmp -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "`n-NoRestart: restart atlandi. Plesk panelinden manuel restart yap." -ForegroundColor Yellow
    }

    if ($failCount -gt 0) { throw "$failCount dosya upload basarisiz — smoke iptal." }
}

# ---------------------------------------------------------------------------
function Invoke-Smoke {
    param($Config, [string[]]$Specs)
    if (-not $Specs -or $Specs.Count -eq 0) {
        $Specs = @('GET /healthz:200','GET /reviews/recent:200','GET /categories/tree:200',
                   'POST /auth/sms/verify:400','POST /auth/firebase:400')
    }
    Write-Host "`nSmoke: $($Config.SmokeBase)" -ForegroundColor Cyan
    $pass = 0; $fail = 0
    foreach ($s in $Specs) {
        if ($s -notmatch '^(GET|POST|PUT|DELETE|PATCH)\s+(\S+):(\d+)$') {
            Write-Host "  skip ($s) — format hatasi" -ForegroundColor DarkYellow
            continue
        }
        $method = $Matches[1]; $path = $Matches[2]; $expected = [int]$Matches[3]
        $url = "$($Config.SmokeBase)$path"
        try {
            $params = @{
                Uri = $url; Method = $method; TimeoutSec = 8; ErrorAction = 'Stop'
                MaximumRedirection = 0; UseBasicParsing = $true
            }
            if ($method -in 'POST','PUT','PATCH') {
                $params.Body = '{}'
                $params.ContentType = 'application/json'
            }
            $resp = Invoke-WebRequest @params
            $actual = [int]$resp.StatusCode
        } catch [System.Net.WebException] {
            $actual = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
        } catch {
            $actual = -1
        }
        $ok = $actual -eq $expected
        if ($ok) { $pass++ } else { $fail++ }
        $color = if ($ok) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-5} {1,-35} expected={2}  actual={3}" -f $method, $path, $expected, $actual) -ForegroundColor $color
    }
    Write-Host "`nSmoke: $pass pass, $fail fail" -ForegroundColor $(if ($fail) { 'Red' } else { 'Green' })
    if ($fail -gt 0) { exit 2 }
}

# ---------------------------------------------------------------------------
switch ($Mode) {
    'help' { Show-Help; return }

    'smoke' {
        $cfg = Get-Config
        Invoke-Smoke -Config $cfg -Specs @()
    }

    'dry-run' {
        $cfg = Get-Config
        $spec = Get-ModuleSpec -Name $Module
        Invoke-DryRun -Config $cfg -Spec $spec
    }

    'live' {
        $cfg = Get-Config
        $spec = Get-ModuleSpec -Name $Module
        Write-Host "`n*** LIVE DEPLOY *** $($Spec.Name) -> $($cfg.Host)$($cfg.RemoteRoot)$($spec.RemoteSub)" -ForegroundColor Red
        Write-Host "feedback_ftp_deploy_default: bu komut sadece sen tetiklersin. 3 sn iptal penceresi..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3

        Invoke-Live -Config $cfg -Spec $spec

        if (-not $NoSmoke) {
            Start-Sleep -Seconds 4   # Passenger restart toparlansin
            Invoke-Smoke -Config $cfg -Specs $spec.SmokeSpecs
        } else {
            Write-Host "-NoSmoke: smoke atlandi." -ForegroundColor Yellow
        }
    }
}
