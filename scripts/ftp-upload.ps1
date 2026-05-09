<#
.SYNOPSIS
  Yapgitsin FTP Live Deploy (PowerShell native, no lftp dependency)
.DESCRIPTION
  Reads .env.deploy, recursively uploads D:\admin/app/backend/web to ftp://$FTP_HOST/$FTP_REMOTE_DIR
.USAGE
  pwsh scripts/ftp-upload.ps1
  veya bash icinden: powershell.exe -ExecutionPolicy Bypass -File scripts/ftp-upload.ps1
#>

$ErrorActionPreference = "Stop"

# .env.deploy parse
$envFile = Join-Path $PSScriptRoot "..\.env.deploy"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.deploy bulunamadi: $envFile"
  exit 1
}

$env_vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $env_vars[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$FTP_HOST = $env_vars['FTP_HOST']
$FTP_USER = $env_vars['FTP_USER']
$FTP_PASS = $env_vars['FTP_PASS']
$FTP_PORT = if ($env_vars['FTP_PORT']) { $env_vars['FTP_PORT'] } else { '21' }
$FTP_REMOTE_DIR = if ($env_vars['FTP_REMOTE_DIR']) { $env_vars['FTP_REMOTE_DIR'] } else { '/httpdocs' }
$FTP_USE_TLS = $env_vars['FTP_USE_TLS'] -eq '1'

if (-not $FTP_HOST -or -not $FTP_USER -or -not $FTP_PASS) {
  Write-Error "FTP_HOST/USER/PASS .env.deploy'da eksik"
  exit 1
}

# 4 hedef path
$mappings = @(
  @{ Local = 'D:\admin';    Remote = "$FTP_REMOTE_DIR/admin" },
  @{ Local = 'D:\app';      Remote = "$FTP_REMOTE_DIR/app" },
  @{ Local = 'D:\backend';  Remote = "$FTP_REMOTE_DIR/backend" },
  @{ Local = 'D:\web';      Remote = "$FTP_REMOTE_DIR" }
)

$cred = New-Object System.Net.NetworkCredential($FTP_USER, $FTP_PASS)

function Ensure-FtpDirectory {
  param([string]$Uri)
  try {
    $request = [System.Net.FtpWebRequest]::Create($Uri)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $request.Credentials = $cred
    $request.EnableSsl = $FTP_USE_TLS
    $request.UsePassive = $true
    $request.UseBinary = $true
    $request.GetResponse().Close()
  } catch [System.Net.WebException] {
    # 550 = already exists, ignore
  }
}

function Upload-File {
  param([string]$LocalPath, [string]$RemoteUri)
  for ($i = 0; $i -lt 3; $i++) {
    try {
      $request = [System.Net.FtpWebRequest]::Create($RemoteUri)
      $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
      $request.Credentials = $cred
      $request.EnableSsl = $FTP_USE_TLS
      $request.UsePassive = $true
      $request.UseBinary = $true

      $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
      $stream = $request.GetRequestStream()
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Close()
      $request.GetResponse().Close()
      return $true
    } catch {
      if ($i -eq 2) { Write-Warning "FAIL $LocalPath -> $RemoteUri : $_"; return $false }
      Start-Sleep -Seconds (2 * ($i + 1))
    }
  }
}

function Upload-Directory {
  param([string]$LocalRoot, [string]$RemoteRoot)
  $files = Get-ChildItem -Path $LocalRoot -Recurse -File
  $total = $files.Count
  $done = 0
  $createdDirs = @{}

  Write-Host "-> $LocalRoot ($total dosya) -> ftp://$FTP_HOST$RemoteRoot" -ForegroundColor Cyan

  foreach ($f in $files) {
    $rel = $f.FullName.Substring($LocalRoot.Length).TrimStart('\').Replace('\', '/')
    $remoteFileUri = "ftp://${FTP_HOST}:${FTP_PORT}${RemoteRoot}/${rel}"

    # Klasor yapisi ensure
    $segments = $rel.Split('/')
    if ($segments.Length -gt 1) {
      $accumulated = $RemoteRoot
      for ($s = 0; $s -lt $segments.Length - 1; $s++) {
        $accumulated = "$accumulated/$($segments[$s])"
        if (-not $createdDirs.ContainsKey($accumulated)) {
          $dirUri = "ftp://${FTP_HOST}:${FTP_PORT}${accumulated}"
          Ensure-FtpDirectory -Uri $dirUri
          $createdDirs[$accumulated] = $true
        }
      }
    }

    if (Upload-File -LocalPath $f.FullName -RemoteUri $remoteFileUri) {
      $done++
      if ($done % 25 -eq 0 -or $done -eq $total) {
        Write-Host "  [$done/$total] $rel" -ForegroundColor Green
      }
    }
  }

  Write-Host "OK $LocalRoot tamam ($done/$total)" -ForegroundColor Green
}

# Root remote dir ensure
Ensure-FtpDirectory -Uri "ftp://${FTP_HOST}:${FTP_PORT}${FTP_REMOTE_DIR}"

# Her hedef icin upload
foreach ($m in $mappings) {
  if (-not (Test-Path $m.Local)) {
    Write-Warning "Skip: $($m.Local) yok"
    continue
  }
  Upload-Directory -LocalRoot $m.Local -RemoteRoot $m.Remote
}

Write-Host ""
Write-Host "Live deploy tamam: https://$FTP_HOST/" -ForegroundColor Magenta
