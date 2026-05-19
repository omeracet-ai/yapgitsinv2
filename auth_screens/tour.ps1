$adb = "C:\Users\Equ\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$pkg = "com.yapgitsin.app.hizmet_app"
$outDir = "D:\Yapgitsinv2\auth_screens"
$routes = @(
  "splash","hos-geldiniz","usta-baslangic","giris-yap","kayit-ol","forgot-password","verify-email","auth/sms-verify","2fa-challenge","2fa-setup","reset-password",
  "","jetonlar","promo","sadakat","abonelik","kategori-abonelikleri","boost","kazanclarim","aylik-beyan","escrow-listesi",
  "sablonlarim","teklif-sablonlarim","sertifikalarim","mesaj-sablonlarim","favorilerim","engellenenler","kaydedilen-isler","bildirim-ayarlari","destek","asistan","sikayetlerim","sikayet-olustur",
  "harita","portfolyo","ilan-basarili","ilan-ver","takvim-sync"
)

foreach ($r in $routes) {
  $slug = if ($r -eq "") { "root" } else { $r -replace "/","_" }
  $png = Join-Path $outDir "$slug.png"
  $xml = Join-Path $outDir "$slug.xml"
  $url = "yapgitsin://app/$r"
  & $adb shell am force-stop $pkg | Out-Null
  Start-Sleep -Milliseconds 400
  & $adb shell am start -W -a android.intent.action.VIEW -d "`"$url`"" $pkg 2>&1 | Out-Null
  Start-Sleep -Seconds 7
  & $adb exec-out screencap -p > $png
  & $adb shell uiautomator dump /sdcard/ui.xml 2>&1 | Out-Null
  & $adb pull /sdcard/ui.xml $xml 2>&1 | Out-Null
  Write-Host "DONE $slug"
}
