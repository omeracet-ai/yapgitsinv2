<?php
echo "Şu anki Fiziksel Yol: " . __DIR__ . "<br>";
echo "Belge Kök Dizini: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "Klasör İçeriği: <br>";
print_r(scandir(__DIR__));
?>
