<?php
echo "Üst Klasör: <br>";
$files = scandir('../');
foreach($files as $file) echo $file . "<br>";
?>
