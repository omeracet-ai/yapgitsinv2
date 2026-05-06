<?php
if (class_exists('ZipArchive')) {
    echo "ZipArchive mevcut.";
} else {
    echo "Hata: ZipArchive sınıfı sunucuda yüklü değil!";
}
?>
