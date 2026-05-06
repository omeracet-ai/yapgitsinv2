<?php
$zipFile = 'web_final_tr.zip';
$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    echo "<h1>Müdür, Final Türkçe Web Sürümü Başarıyla Kuruldu!</h1>";
} else {
    echo "Hata: web_final_tr.zip açılamadı.";
}
?>
