#!/usr/bin/env pwsh

# Voldi-Ops FlutterFlow Auto-Sync & Push Script
$ProjectID = "yapgitsinv2"
$DestPath = "."

Write-Host "🚀 [MÜDÜR] FlutterFlow Otonom Senkronizasyon Başlatıldı..." -ForegroundColor Cyan

while($true) {
    Write-Host "📡 [$(Get-Date -Format 'HH:mm:ss')] FlutterFlow'dan kod çekiliyor..."
    
    try {
        # 1. Export code from FlutterFlow
        flutterflow export-code --project $ProjectID --dest $DestPath --include-assets --yes
        
        # 2. Check for changes
        $status = git status --porcelain
        if ($status) {
            Write-Host "✨ [MÜDÜR] Değişiklik tespit edildi! GitHub'a basılıyor..." -ForegroundColor Green
            
            git add .
            git commit -m "fix: otonom flutterflow sync [$(Get-Date -Format 'yyyy-MM-dd HH:mm')]"
            git push origin master
            
            Write-Host "✅ [MÜDÜR] Başarıyla push edildi." -ForegroundColor Green
        } else {
            Write-Host "😴 [MÜDÜR] Değişiklik yok, bekleniyor..." -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ [MÜDÜR] Hata oluştu: $_" -ForegroundColor Red
    }
    
    # 5 dakikada bir kontrol et
    Start-Sleep -Seconds 300
}
