<?php
echo "<h1>Z.ZIP Patlatma Operasyonu Başladı...</h1>";
$file = 'z.zip';

if (file_exists($file)) {
    echo "Buldum! Dosya mevcut. <br>";
    echo "İzinler: " . substr(sprintf('%o', fileperms($file)), -4) . "<br>";
    
    // İzinleri zorla açmayı dene
    chmod($file, 0777);
    
    $zip = new ZipArchive;
    $res = $zip->open($file);
    if ($res === TRUE) {
        $zip->extractTo('./');
        $zip->close();
        echo "<b>BAŞARIYLA ÇIKARILDI!</b> Müdür, işlem tamam.";
    } else {
        echo "Hata: Zip dosyası açılamadı. Hata Kodu: " . $res;
        // Hata kodları: 19 (Not a zip archive), 11 (Can't open file) vb.
    }
} else {
    echo "Hata: z.zip hala PHP tarafından görülemiyor. <br>";
    echo "Sunucu Saati: " . date('Y-m-d H:i:s') . "<br>";
    echo "Fiziksel Yol: " . __DIR__ . "<br>";
}
?>
