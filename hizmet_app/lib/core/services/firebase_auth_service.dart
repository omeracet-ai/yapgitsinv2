import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../network/api_client.dart';
import 'secure_token_store.dart';

class FirebaseAuthService {
  FirebaseAuthService({ApiClient? apiClient})
      : _api = apiClient ?? ApiClient();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final ApiClient _api;
  Dio get _dio => _api.dio;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<UserCredential> signInWithEmail(String email, String password) async {
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<UserCredential> registerWithEmail({
    required String email,
    required String password,
    required String fullName,
    String? phone,
    String? city,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    await cred.user?.updateDisplayName(fullName);

    // Profil bilgilerini backend'e yaz (PATCH /users/me).
    // Auth interceptor Bearer header'ı otomatik ekler; backend kullanıcıyı
    // ilk korumalı çağrıda provision eder.
    try {
      await _dio.patch<dynamic>('/users/me', data: {
        'fullName': fullName,
        if (phone != null && phone.isNotEmpty) 'phoneNumber': phone,
        if (city != null && city.isNotEmpty) 'city': city,
      });
    } on DioException {
      // Backend henüz JWT'yi tanımıyorsa sessizce geç — sonraki çağrılarda
      // /users/me PATCH tekrar denenebilir. Hata profile_screen tarafında
      // gösterilir.
    }

    return cred;
  }

  Future<void> sendPasswordResetEmail(String email) =>
      _auth.sendPasswordResetEmail(email: email);

  Future<void> sendEmailVerification() =>
      _auth.currentUser!.sendEmailVerification();

  Future<void> signOut() => _auth.signOut();

  Future<void> deleteAccount(String password) async {
    final user = _auth.currentUser!;
    final cred = EmailAuthProvider.credential(
      email: user.email!,
      password: password,
    );
    await user.reauthenticateWithCredential(cred);
    try {
      await _dio.delete<dynamic>('/users/me');
    } on DioException {
      // Backend silme başarısız olsa bile Firebase kullanıcısını silmeye devam et.
    }
    await user.delete();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async =>
      _auth.currentUser?.getIdToken(forceRefresh);

  Future<Map<String, dynamic>?> getUserProfile() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return null;
    try {
      final res = await _dio.get<dynamic>('/users/me');
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } on DioException {
      return null;
    }
  }

  Future<void> updateUserProfile(Map<String, dynamic> data) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;
    // Backend `updatedAt`'i kendi yönetir; payload'ı dokunmadan PATCH'le.
    await _dio.patch<dynamic>('/users/me', data: data);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Phase 191 — Google + Apple Sign-In
  // ────────────────────────────────────────────────────────────────────────
  // Phase 225: Firestore yazımı kaldırıldı. Backend Firebase token → JWT
  // bridge endpoint'i (örn. POST /auth/firebase) eklenince _ensureUserDoc
  // PATCH /users/me ile gerçek profil oluşturacak. Şimdilik best-effort
  // PATCH denenir; JWT yoksa sessizce geçilir (mevcut davranışla eşdeğer
  // — Firestore yazımının okuyucusu zaten yoktu).

  /// Google Sign-In → Firebase credential.
  /// Throws [FirebaseAuthException] on Firebase errors and a generic
  /// [Exception('sign_in_canceled')] when the user dismisses the picker.
  Future<UserCredential> signInWithGoogle() async {
    if (kIsWeb) {
      // Web flow: Firebase provides a popup via GoogleAuthProvider directly.
      final provider = GoogleAuthProvider()..addScope('email');
      final cred = await _auth.signInWithPopup(provider);
      await _ensureUserDoc(cred.user, providerLabel: 'google');
      return cred;
    }

    final googleUser = await GoogleSignIn().signIn();
    if (googleUser == null) {
      throw Exception('sign_in_canceled');
    }
    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    final userCred = await _auth.signInWithCredential(credential);
    await _ensureUserDoc(userCred.user,
        providerLabel: 'google', fallbackName: googleUser.displayName);
    return userCred;
  }

  /// Apple Sign-In → Firebase credential.
  /// Apple only returns the full name on the very first authorization,
  /// so we persist it eagerly into the Firestore profile when present.
  Future<UserCredential> signInWithApple() async {
    final rawNonce = _generateNonce();
    final nonce = _sha256(rawNonce);

    final appleCredential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      nonce: nonce,
    );

    final oauthCredential = OAuthProvider('apple.com').credential(
      idToken: appleCredential.identityToken,
      rawNonce: rawNonce,
      accessToken: appleCredential.authorizationCode,
    );

    final userCred = await _auth.signInWithCredential(oauthCredential);

    // Compose full name from Apple's first-only payload.
    final composed = [
      appleCredential.givenName,
      appleCredential.familyName,
    ].where((s) => s != null && s.isNotEmpty).join(' ').trim();
    if (composed.isNotEmpty && (userCred.user?.displayName ?? '').isEmpty) {
      await userCred.user?.updateDisplayName(composed);
    }

    await _ensureUserDoc(userCred.user,
        providerLabel: 'apple',
        fallbackName: composed.isNotEmpty ? composed : null,
        fallbackEmail: appleCredential.email);
    return userCred;
  }

  /// Convenience for full sign-out across both Firebase and the Google plugin
  /// (Google caches the last account; without disconnect the next "Sign in"
  /// silently reuses it).
  Future<void> signOutAll() async {
    try {
      if (!kIsWeb) {
        final g = GoogleSignIn();
        if (await g.isSignedIn()) {
          await g.signOut();
        }
      }
    } catch (_) {}
    await _auth.signOut();
  }

  /// Returns whether Apple Sign-In can be offered on this device.
  /// App Store policy: must be shown on iOS when any other social
  /// sign-in is offered.
  static bool get isAppleSignInAvailable {
    if (kIsWeb) return true;
    return Platform.isIOS || Platform.isMacOS;
  }

  Future<void> _ensureUserDoc(
    User? user, {
    required String providerLabel,
    String? fallbackName,
    String? fallbackEmail,
  }) async {
    if (user == null) return;

    // Phase 226 — Firebase ID token → backend JWT bridge.
    // 1) get a fresh Firebase ID token (force refresh = catch token-revoked)
    // 2) POST /auth/firebase → backend verifies & issues its own JWT pair
    // 3) persist tokens so the next /users/me PATCH carries the correct
    //    backend Bearer (not the Firebase ID token).
    String? idToken;
    try {
      idToken = await user.getIdToken(true);
    } catch (_) {
      // Token alınamadıysa eski davranışa düş (sessiz PATCH).
      idToken = null;
    }

    if (idToken != null && idToken.isNotEmpty) {
      try {
        final res = await _dio.post<dynamic>(
          '/auth/firebase',
          data: {'idToken': idToken},
          // Don't send any stale Bearer — bridge accepts the Firebase token
          // in the body, not the header.
          options: Options(headers: {'Authorization': ''}),
        );
        final data = res.data;
        bool tokenStored = false;
        if (data is Map) {
          final access = data['access_token'];
          final refresh = data['refresh_token'];
          if (access is String && access.isNotEmpty) {
            final store = SecureTokenStore();
            await store.writeToken(access);
            if (refresh is String && refresh.isNotEmpty) {
              await store.writeRefreshToken(refresh);
            }
            tokenStored = true;
          }
        }
        if (!tokenStored) {
          // Bridge 200 döndü ama token yok — yarım giriş, görünür hata yap.
          await _auth.signOut();
          throw Exception('social_bridge_no_token');
        }
      } on DioException catch (e) {
        // Phase 233 — bridge fail görünür hata.
        // 401/5xx veya network: yarım giriş kalmasın, Firebase oturumunu
        // temizle ve üst katmana fırlat. Üst katman (login ekranı) kullanıcıya
        // mesaj gösterir.
        await _auth.signOut();
        final code = e.response?.statusCode;
        throw Exception('social_bridge_failed:${code ?? 'network'}');
      }
    } else {
      // Firebase ID token alınamadıysa backend JWT mümkün değil; yarım
      // girişe izin verme.
      await _auth.signOut();
      throw Exception('social_bridge_no_idtoken');
    }

    // Profile PATCH — şimdi backend JWT'si ile (varsa) çağrılır; yoksa
    // mevcut sessiz-fail davranışı korunur.
    final fullName =
        user.displayName ?? fallbackName ?? (user.email ?? 'Kullanıcı');
    final email = user.email ?? fallbackEmail ?? '';
    try {
      await _dio.patch<dynamic>('/users/me', data: {
        'fullName': fullName,
        if (email.isNotEmpty) 'email': email,
        if ((user.phoneNumber ?? '').isNotEmpty) 'phoneNumber': user.phoneNumber,
      });
    } on DioException {
      // JWT yok / backend henüz Firebase token tanımıyor → sessiz geç.
    }
  }

  /// Cryptographically secure nonce for Apple Sign-In replay protection.
  String _generateNonce([int length = 32]) {
    const charset =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)])
        .join();
  }

  String _sha256(String input) {
    final bytes = utf8.encode(input);
    return sha256.convert(bytes).toString();
  }
}
