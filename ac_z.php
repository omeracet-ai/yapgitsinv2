<?php
$zipFile = 'z.zip';
if (file_exists($zipFile)) {
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo('./');
        $zip->close();
        echo "<h1>Müdür, z.zip başarıyla patlatıldı!</h1>";
        echo "Dosyalar çıkarıldı. Şimdi siteyi kontrol edebilirsiniz.";
    } else {
        echo "Hata: z.zip açılamadı. Bozuk olabilir.";
    }
} else {
    echo "Hata: z.zip hala bulunamadı. Mevcut dosyalar: <br>";
    print_r(scandir('./'));
}
?>
