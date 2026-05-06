<?php
echo "<h1>Müdür, Dosyalar Kök Dizine Taşınıyor...</h1>";

function moveFiles($src, $dst) {
    $files = scandir($src);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        if (rename($src . '/' . $file, $dst . '/' . $file)) {
            echo "Taşındı: $file <br>";
        } else {
            echo "HATA: $file taşınamadı. <br>";
        }
    }
}

moveFiles('./app', './');
echo "<h2>Operasyon Bitti!</h2>";
?>
