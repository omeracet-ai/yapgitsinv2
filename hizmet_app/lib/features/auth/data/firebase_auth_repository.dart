import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firebase_auth_service.dart';

final firebaseAuthServiceProvider = Provider((_) => FirebaseAuthService());

final firebaseAuthRepositoryProvider =
    Provider((ref) => FirebaseAuthRepository(ref.read(firebaseAuthServiceProvider)));

class FirebaseAuthRepository {
  FirebaseAuthRepository(this._service);

  final FirebaseAuthService _service;

  User? get currentUser => _service.currentUser;
  Stream<User?> get authStateChanges => _service.authStateChanges;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final cred = await _service.signInWithEmail(email, password);
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
      final token = await cred.user?.getIdToken() ?? '';
      return {
        'access_token': token,
        'user': {
          'id': cred.user?.uid,
          'email': cred.user?.email,
          'displayName': fullName,
          'emailVerified': false,
        },
      };
    } on FirebaseAuthException catch (e) {
      throw Exception(_mapFirebaseError(e.code));
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

  Future<void> deleteAccount(String password) async {
    try {
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

  /// Returns user profile data as a JSON string (KVKK data export stub).
  Future<String> downloadDataExport() async {
    final profile = await _service.getUserProfile();
    final user = _service.currentUser;
    final data = {
      'uid': user?.uid,
      'email': user?.email,
      'displayName': user?.displayName,
      'emailVerified': user?.emailVerified,
      ...?profile,
    };
    return data.toString();
  }

  /// Queues a data deletion request (KVKK Madde 11 stub).
  Future<void> requestDataDeletion(String reason) async {
    // Stub: log the request; actual deletion handled server-side.
    return;
  }

  /// Disables two-factor authentication (stub).
  Future<void> disable2FA(String code) async {
    // Stub: 2FA disable handled server-side.
    return;
  }

  /// Returns 2FA setup data (secret + QR code URL) — stub.
  Future<Map<String, dynamic>> setup2FA() async {
    return {'secret': '', 'qrDataUrl': ''};
  }

  /// Enables 2FA with a TOTP code — stub.
  Future<void> enable2FA(String code) async {
    return;
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
