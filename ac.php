<?php
$zip = new ZipArchive;
if ($zip->open('deploy_final_v2.zip') === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    echo 'Müdür, dosyalar başarıyla çıkarıldı! Antigravity işini bitirdi. <br> Şimdi sunucuyu başlatabilirsiniz.';
} else {
    echo 'Hata: deploy_final_v2.zip dosyası açılamadı. Lütfen dosya adının doğru olduğundan emin olun.';
}
?>
