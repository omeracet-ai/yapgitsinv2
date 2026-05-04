# HizmetApp - Cloudflare Tunnel Başlatıcı
# Her çalıştırmada yeni URL üretilir, aşağıyı güncel tutun.

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HizmetApp Cloudflare Tunnel Başlatıcı" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Önceki log dosyalarını temizle
Remove-Item "$env:USERPROFILE\.cloudflared\backend-err.txt" -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\.cloudflared\admin-err.txt"   -ErrorAction SilentlyContinue

# Backend tüneli (port 3001)
Write-Host "[1/2] Backend tüneli açılıyor (port 3001)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "cloudflared" `
  -ArgumentList "tunnel --url http://localhost:3001" `
  -RedirectStandardError "$env:USERPROFILE\.cloudflared\backend-err.txt"

# Admin tüneli (port 3000)
Write-Host "[2/2] Admin panel tüneli açılıyor (port 3000)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "cloudflared" `
  -ArgumentList "tunnel --url http://localhost:3000" `
  -RedirectStandardError "$env:USERPROFILE\.cloudflared\admin-err.txt"

# URL'leri bekle
Write-Host ""
Write-Host "URL'ler bekleniyor..." -ForegroundColor Gray

$backendUrl = ""
$adminUrl   = ""

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    if (-not $backendUrl) {
        $backendUrl = Select-String -Path "$env:USERPROFILE\.cloudflared\backend-err.txt" `
            -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue |
            ForEach-Object { $_.Matches[0].Value } | Select-Object -First 1
    }
    if (-not $adminUrl) {
        $adminUrl = Select-String -Path "$env:USERPROFILE\.cloudflared\admin-err.txt" `
            -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue |
            ForEach-Object { $_.Matches[0].Value } | Select-Object -First 1
    }
    if ($backendUrl -and $adminUrl) { break }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  HAZIR!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API : $backendUrl" -ForegroundColor White
Write-Host "  Admin Panel : $adminUrl"   -ForegroundColor White
Write-Host ""
Write-Host "  Flutter calistiric komutu:" -ForegroundColor Cyan
Write-Host "  flutter run --dart-define=API_URL=$backendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "  APK build:" -ForegroundColor Cyan
Write-Host "  flutter build apk --dart-define=API_URL=$backendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cikmak icin Ctrl+C" -ForegroundColor Gray
Write-Host ""

# Tunnel'ları açık tut
Wait-Event
