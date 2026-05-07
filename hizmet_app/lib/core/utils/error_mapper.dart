import 'package:dio/dio.dart';

/// Kullanıcıya gösterilecek anlaşılır hata mesajına çevirir.
/// Ham `Exception.toString()` veya `Hata: $e` yerine bu helper'ı kullan.
String mapErrorToUserMessage(Object e) {
  if (e is DioException) {
    final status = e.response?.statusCode;
    if (status != null) {
      if (status == 401) {
        return 'Oturum süresi doldu, tekrar giriş yapın.';
      }
      if (status == 403) {
        return 'Bu işlem için yetkiniz yok.';
      }
      if (status == 404) {
        return 'İstediğiniz içerik bulunamadı.';
      }
      if (status >= 500 && status < 600) {
        return 'Sunucuda geçici bir sorun var, tekrar dene.';
      }
    }
    // Bağlantı / timeout / network hataları
    return 'Sunucuya ulaşılamadı, internet bağlantınızı kontrol edin.';
  }
  return 'Bir şeyler ters gitti — tekrar dene.';
}
