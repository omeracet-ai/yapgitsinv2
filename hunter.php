<?php
echo "<h1>Büyük Dosya Avcısı Başladı...</h1>";
$files = scandir('./');
foreach($files as $file) {
    if ($file === '.' || $file === '..') continue;
    $size = filesize($file);
    echo "Dosya: $file - Boyut: " . round($size / 1024 / 1024, 2) . " MB <br>";
    if ($size > 1000000 && stripos($file, '.zip') !== false) {
        echo "<b>HEDEF BULUNDU! Çıkarılıyor...</b><br>";
        $zip = new ZipArchive;
        if ($zip->open($file) === TRUE) {
            $zip->extractTo('./');
            $zip->close();
            echo "BAŞARILI!";
        }
    }
}
?>
