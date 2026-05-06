<?php
echo "Müdür, klasörde şu dosyalar var: <br>";
$files = scandir('./');
foreach($files as $file) {
    echo $file . "<br>";
}
?>
