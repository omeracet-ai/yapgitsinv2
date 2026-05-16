import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/services/firebase_auth_service.dart';

final firebaseAuthServiceProvider = Provider((_) => FirebaseAuthService());

final firebaseAuthRepositoryProvider = Provider(
  (ref) => FirebaseAuthRepository(
    ref.read(firebaseAuthServiceProvider),
    ref.read(apiClientProvider),
  ),
);

class FirebaseAuthRepository {
  FirebaseAuthRepository(this._service, this._api);

  final FirebaseAuthService _service;
  final ApiClient _api;
  Dio get _dio => _api.dio;

  /// Phase 241 — DioException → Türkçe kullanıcı mesajı.
  String _mapDioError(DioException e, {String fallback = 'Sunucuya erişilemedi.'}) {
    final code = e.response?.statusCode;
    final body = e.response?.data;
    if (body is Map) {
      final msg = body['message'] ?? body['error'];
      if (msg is String && msg.isNotEmpty) return msg;
    }
    switch (code) {
      case 400:
        return 'Geçersiz istek.';
      case 401:
        return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
      case 403:
        return 'Bu işlem için yetkiniz yok.';
      case 404:
        return 'Kayıt bulunamadı.';
      case 409:
        return 'İşlem çakışması (409).';
      case 429:
        return 'Çok fazla deneme. Lütfen bekleyin.';
      case 500:
      case 502:
      case 503:
        return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      default:
        return fallback;
    }
  }

  User? get currentUser => _service.currentUser;
  Stream<User?> get authStateChanges => _service.authStateChanges;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final cred = await _service.signInWithEmail(email, password);
      // Phase 240D — Bridge Firebase ID token → backend JWT pair and persist
      // to SecureTokenStore so protected REST calls succeed.
      final bridge = await _service.bridgeToBackend();
      final bridgeUser = bridge['user'];
      final profileFromBridge =
          bridgeUser is Map ? Map<String, dynamic>.from(bridgeUser) : null;
      final profile = profileFromBridge ?? await _service.getUserProfile();
      return {
        'access_token': bridge['access_token'],
        if (bridge['refresh_token'] != null)
          'refresh_token': bridge['refresh_token'],
        'user': {
          'id': cred.user?.uid,
          'email': cred.user?.email,
          'displayName': cred.user?.displayName,
          'emailVerified': cred.user?.emailVerified,
          ...?profile,
        },
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    } catch (e) {
      // Phase 240D — bridge fail görünür Türkçe hata.
      final msg = e.toString();
      if (msg.contains('social_bridge_failed') ||
          msg.contains('social_bridge_no_token') ||
          msg.contains('social_bridge_no_idtoken')) {
        throw Exception(
            'Giriş şu an tamamlanamadı. Lütfen birazdan tekrar deneyin.');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String password,
    String? phoneNumber,
    String? city,
  }) async {
    try {
      final cred = await _service.registerWithEmail(
        email: email,
        password: password,
        fullName: fullName,
        phone: phoneNumber,
        city: city,
      );
      // Phase 240D — Bridge to backend JWT after Firebase register.
      final bridge = await _service.bridgeToBackend();
      return {
        'access_token': bridge['access_token'],
        if (bridge['refresh_token'] != null)
          'refresh_token': bridge['refresh_token'],
        'user': {
          'id': cred.user?.uid,
          'email': cred.user?.email,
          'displayName': fullName,
          'emailVerified': false,
        },
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('social_bridge_failed') ||
          msg.contains('social_bridge_no_token') ||
          msg.contains('social_bridge_no_idtoken')) {
        throw Exception(
            'Kayıt tamamlandı ancak giriş yapılamadı. Lütfen tekrar giriş yapın.');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      await _service.sendPasswordResetEmail(email);
      return {
        'message': 'Eğer bu e-posta sistemde kayıtlıysa sıfırlama bağlantısı gönderildi.',
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    }
  }

  Future<void> sendEmailVerification() async {
    try {
      await _service.sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    }
  }

  Future<void> logout() => _service.signOutAll();

  /// Google Sign-In — returns the same shape as [login] for AuthNotifier.
  /// Throws Exception('sign_in_canceled') if user dismissed the picker.
  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      final cred = await _service.signInWithGoogle();
      final token = await cred.user?.getIdToken() ?? '';
      final profile = await _service.getUserProfile();
      return {
        'access_token': token,
        'user': {
          'id': cred.user?.uid,
          'email': cred.user?.email,
          'displayName': cred.user?.displayName,
          'emailVerified': cred.user?.emailVerified,
          ...?profile,
        },
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    } catch (e) {
      // Re-throw cancellation as a structured marker so UI can stay silent.
      final msg = e.toString();
      if (msg.contains('sign_in_canceled')) rethrow;
      // Phase 233 — sosyal sign-in bridge fail görünür hata.
      if (msg.contains('social_bridge_failed') ||
          msg.contains('social_bridge_no_token') ||
          msg.contains('social_bridge_no_idtoken')) {
        throw Exception(
            'Sosyal giriş şu an kullanılamıyor. Lütfen e-posta ile giriş yapın.');
      }
      throw Exception('Google ile giriş başarısız: $e');
    }
  }

  /// Apple Sign-In — returns the same shape as [login] for AuthNotifier.
  Future<Map<String, dynamic>> signInWithApple() async {
    try {
      final cred = await _service.signInWithApple();
      final token = await cred.user?.getIdToken() ?? '';
      final profile = await _service.getUserProfile();
      return {
        'access_token': token,
        'user': {
          'id': cred.user?.uid,
          'email': cred.user?.email,
          'displayName': cred.user?.displayName,
          'emailVerified': cred.user?.emailVerified,
          ...?profile,
        },
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    } catch (e) {
      // sign_in_with_apple throws SignInWithAppleAuthorizationException with
      // code 'canceled' when the user dismisses the sheet.
      final msg = e.toString();
      if (msg.contains('canceled') || msg.contains('cancelled')) {
        throw Exception('sign_in_canceled');
      }
      // Phase 233 — sosyal sign-in bridge fail görünür hata.
      if (msg.contains('social_bridge_failed') ||
          msg.contains('social_bridge_no_token') ||
          msg.contains('social_bridge_no_idtoken')) {
        throw Exception(
            'Sosyal giriş şu an kullanılamıyor. Lütfen e-posta ile giriş yapın.');
      }
      throw Exception('Apple ile giriş başarısız: $e');
    }
  }

  /// Phase 241 — Backend `DELETE /users/me` önce çağrılır. Backend silme
  /// başarısız olursa Firebase silme abort edilir (orphan veri kalmasın).
  /// `_service.deleteAccount` reauth + Firebase delete'i yapar; bu metod
  /// sadece sıralamayı garanti eder.
  Future<void> deleteAccount(String password) async {
    try {
      // Backend silme dene — başarısız olursa ABORT.
      try {
        await _dio.delete<dynamic>('/users/me');
      } on DioException catch (e) {
        // 404 → backend kayıt zaten yok, Firebase silmeye devam edebiliriz.
        if (e.response?.statusCode != 404) {
          throw Exception(_mapDioError(e,
              fallback: 'Hesap silme şu an tamamlanamadı. Lütfen tekrar deneyin.'));
        }
      }
      // Backend OK → Firebase reauth + delete.
      await _service.deleteAccount(password);
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    }
  }

  Future<String?> getToken() => _service.getIdToken();

  Future<Map<String, dynamic>?> getUserProfile() => _service.getUserProfile();

  Future<void> updateProfile(Map<String, dynamic> data) =>
      _service.updateUserProfile(data);

  /// Sends an email verification link. Returns empty map on success.
  Future<Map<String, dynamic>> requestEmailVerification() async {
    try {
      await _service.sendEmailVerification();
      return {};
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    }
  }

  /// Phase 241 — KVKK Madde 11 veri ihracı. Backend `GET /users/me/data-export`
  /// JSON döner; serialize edilmiş string olarak iletilir.
  Future<String> downloadDataExport() async {
    try {
      final res = await _dio.get<dynamic>('/users/me/data-export');
      final data = res.data;
      if (data is String) return data;
      // Map/List → JSON string
      return data.toString();
    } on DioException catch (e) {
      throw Exception(_mapDioError(e,
          fallback: 'Veri ihracı şu an alınamadı. Lütfen tekrar deneyin.'));
    }
  }

  /// Phase 241 — KVKK Madde 11 veri silme talebi. Backend
  /// `POST /users/me/data-delete-request` ile kuyruğa alınır.
  Future<void> requestDataDeletion(String reason) async {
    try {
      await _dio.post<dynamic>(
        '/users/me/data-delete-request',
        data: {'reason': reason},
      );
    } on DioException catch (e) {
      throw Exception(_mapDioError(e,
          fallback: 'Silme talebi şu an gönderilemedi. Lütfen tekrar deneyin.'));
    }
  }

  /// Phase 241 — 2FA setup. Backend `POST /auth/2fa/setup` →
  /// `{secret, qrCodeUrl}` döner.
  Future<Map<String, dynamic>> setup2FA() async {
    try {
      final res = await _dio.post<dynamic>('/auth/2fa/setup');
      final data = res.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return {'secret': '', 'qrDataUrl': ''};
    } on DioException catch (e) {
      throw Exception(_mapDioError(e,
          fallback: '2FA kurulum başlatılamadı. Lütfen tekrar deneyin.'));
    }
  }

  /// Phase 241 — 2FA enable. Backend `POST /auth/2fa/enable {code}`.
  Future<void> enable2FA(String code) async {
    try {
      await _dio.post<dynamic>('/auth/2fa/enable', data: {'code': code});
    } on DioException catch (e) {
      throw Exception(_mapDioError(e,
          fallback: '2FA etkinleştirilemedi. Kodu kontrol edip tekrar deneyin.'));
    }
  }

  /// Phase 241 — 2FA disable. Backend `POST /auth/2fa/disable {code}`.
  Future<void> disable2FA(String code) async {
    try {
      await _dio.post<dynamic>('/auth/2fa/disable', data: {'code': code});
    } on DioException catch (e) {
      throw Exception(_mapDioError(e,
          fallback: '2FA devre dışı bırakılamadı. Kodu kontrol edip tekrar deneyin.'));
    }
  }

  /// Resets password using a token (oobCode) via Firebase Auth.
  Future<void> resetPassword(String token, String newPassword) async {
    try {
      await FirebaseAuth.instance.confirmPasswordReset(
        code: token,
        newPassword: newPassword,
      );
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
    }
  }

  /// Confirms email verification using a token — stub (Firebase handles via link).
  Future<void> confirmEmailVerification(String token) async {
    return;
  }

  String _mapFirebaseError(String code) => switch (code) {
        'user-not-found' => 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.',
        'wrong-password' => 'Şifre hatalı.',
        'email-already-in-use' => 'Bu e-posta adresi zaten kullanımda.',
        'weak-password' => 'Şifre en az 6 karakter olmalı.',
        'invalid-email' => 'Geçersiz e-posta adresi.',
        'too-many-requests' => 'Çok fazla deneme. Lütfen bekleyin.',
        'network-request-failed' => 'Bağlantı hatası.',
        'user-disabled' => 'Hesap devre dışı bırakıldı.',
        'account-exists-with-different-credential' =>
            'Bu e-posta başka bir giriş yöntemiyle kayıtlı. Lütfen önceki yöntemle giriş yapın.',
        'invalid-credential' => 'Geçersiz kimlik bilgisi.',
        'operation-not-allowed' =>
            'Bu giriş yöntemi henüz etkin değil. Firebase Console > Authentication üzerinden açın.',
        _ => 'Bir hata oluştu: $code',
      };
}
