<?php
// Yapgitsin.tr Otomatik Yayınlama Scripti
$zipFile = 'yapgitsin.zip';
$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    echo '<h1>Müdür, Yapgitsin.tr dosyaları başarıyla çıkarıldı!</h1>';
    echo '<p>Antigravity ve Müdür ortaklığıyla proje canlıya alındı.</p>';
} else {
    echo 'Hata: ' . $zipFile . ' dosyası bulunamadı veya açılamadı.';
}
?>
