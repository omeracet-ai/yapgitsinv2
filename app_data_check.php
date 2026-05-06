<?php
echo "App_Data Klasörü: <br>";
$files = scandir('./App_Data');
foreach($files as $file) echo $file . "<br>";
?>
