/// Türkçe-doğru büyük/küçük harf dönüşümleri.
///
/// Dart'ın `String.toUpperCase()`'i locale-bağımsızdır: "i" → "I" üretir, ama
/// Türkçe'de "i" → "İ" olmalı (ve "ı" → "I"). Diğer Türkçe harfleri
/// (ç ç, ş ş, ğ ğ, ö ö, ü ü) Dart Unicode kuralıyla zaten doğru dönüştürür;
/// tek sorunlu harf "i"/"ı" çiftidir. Avatar baş harfleri ve isim gösterimleri
/// için bu yardımcıları kullan — IBAN/promo kodu/enum gibi ASCII metinlerde
/// KULLANMA (onlar locale-bağımsız kalmalı).
library;

/// Türkçe büyük harf. "istanbul" → "İSTANBUL", "ışık" → "IŞIK".
String trUpper(String s) => s.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();

/// Türkçe küçük harf. "İSTANBUL" → "istanbul", "IŞIK" → "ışık".
String trLower(String s) => s.replaceAll('I', 'ı').replaceAll('İ', 'i').toLowerCase();

/// Türkçe Title Case. "ıstanbul" → "İstanbul", "İSTANBUL" → "İstanbul",
/// "muğla / fethiye" → "Muğla / Fethiye". Çok kelimeli stringler için
/// her kelimenin baş harfi Türkçe kuralına göre büyütülür.
String trTitle(String s) {
  if (s.isEmpty) return s;
  return s.split(' ').map((word) {
    if (word.isEmpty) return word;
    final first = trUpper(word[0]);
    final rest = trLower(word.substring(1));
    return '$first$rest';
  }).join(' ');
}
