import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/secure_token_store.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());

/// Phase 248+ — Slim auth repo. Tüm legacy NestJS REST auth metodları
/// (login/register/2FA/forgot/reset/verify-email/deleteAccount/data-export/
/// data-deletion/updateAvailability/getUserData/logout) Firebase migration
/// sırasında [FirebaseAuthRepository]'ye taşındı; bu sınıfta yalnız
/// `getToken()` kaldı (notification_prefs_repository tarafından kullanılıyor).
class AuthRepository {
  final SecureTokenStore _secureTokenStore;

  AuthRepository({SecureTokenStore? secureTokenStore})
      : _secureTokenStore = secureTokenStore ?? SecureTokenStore();

  Future<String?> getToken() async {
    try {
      return await _secureTokenStore.readToken();
    } catch (_) {
      return null;
    }
  }
}
