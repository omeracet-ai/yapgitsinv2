<?php
// Yapgitsin.tr Gelişmiş Unzip Scripti
$possibleFiles = ['deploy_yapgitsin.zip', 'yapgitsin.zip', 'deploy_final_v2.zip'];
$found = false;

foreach ($possibleFiles as $zipFile) {
    if (file_exists($zipFile)) {
        $zip = new ZipArchive;
        if ($zip->open($zipFile) === TRUE) {
            $zip->extractTo('./');
            $zip->close();
            echo "<h1>Müdür, $zipFile başarıyla bulundu ve çıkarıldı!</h1>";
            $found = true;
            break;
        }
    }
}

if (!$found) {
    echo "Hata: ZIP dosyaları bulunamadı. Mevcut dosyalar: <br>";
    $files = scandir('./');
    foreach($files as $file) echo $file . "<br>";
}
?>
