<?php
$zipFile = 'web_update.zip';
$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    echo "<h1>Müdür, Web Güncellemesi (Türkçe URL) Başarıyla Kuruldu!</h1>";
} else {
    echo "Hata: web_update.zip açılamadı.";
}
?>
