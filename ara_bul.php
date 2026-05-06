<?php
echo "<h1>Müdür, Derin Arama Başladı...</h1>";

function findZip($dir) {
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($path)) {
            findZip($path);
        } else {
            if (stripos($file, '.zip') !== false) {
                echo "BULDUM! Yol: <b>" . $path . "</b> (Boyut: " . filesize($path) . " bytes)<br>";
                $zip = new ZipArchive;
                if ($zip->open($path) === TRUE) {
                    $zip->extractTo($dir); // Bulunduğu yere aç
                    $zip->close();
                    echo "VE ÇIKARILDI! İşlem tamam Müdür. <br>";
                }
            }
        }
    }
}

findZip('.'); // Mevcut klasörden başla
echo "<br>Tarama bitti.";
?>
