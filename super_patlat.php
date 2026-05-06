<?php
ini_set('max_execution_time', 600); 
ini_set('memory_limit', '512M'); 
echo "<h1>Süper Patlatma Başladı...</h1>";
$file = 'z.zip';
if (!file_exists($file)) {
    die("Hata: z.zip hala bulunamadı.");
}
$zip = new ZipArchive;
if ($zip->open($file) === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    echo "<b>Müdür, Süper Patlatma Başarılı!</b> Dosyalar çıkarıldı.";
} else {
    echo "Hata: ZIP açılamadı. Dosya boyutu: " . filesize($file);
}
?>
