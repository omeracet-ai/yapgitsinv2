import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/firebase_auth_repository.dart';
import '../../../../core/services/fcm_service.dart';
import '../../../../core/services/secure_token_store.dart';
import '../../../profile/data/user_profile_repository.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(firebaseAuthRepositoryProvider),
    ref.watch(userProfileRepositoryProvider),
  );
});

abstract class AuthState { const AuthState(); }
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;
  const AuthAuthenticated(this.user);
  String get displayName =>
      (user['displayName'] ?? user['fullName'] ?? 'Kullanıcı') as String;
}
class AuthUnauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final FirebaseAuthRepository _repository;
  final UserProfileRepository _profileRepo;
  StreamSubscription<dynamic>? _authSub;

  AuthNotifier(this._repository, this._profileRepo) : super(AuthInitial()) {
    // Phase 256 — Cold-start rehydrate from backend JWT (SecureTokenStore).
    // Firebase stream'i dinlemeden ÖNCE backend session'ı restore et; Phase 254
    // email login Firebase'e signIn etmiyor → stream null emit edip
    // AuthAuthenticated state'i SİLMESİN.
    unawaited(_rehydrateFromBackend());

    // Firebase Auth state stream — yalnızca sosyal sign-in (Google/Apple) için.
    _authSub = _repository.authStateChanges.listen((user) async {
      if (user == null) {
        // Phase 256 — Backend-only login (Phase 254 email) için Firebase user
        // null kalıyor; AuthAuthenticated'a DOKUNMA. Sadece pre-auth state'leri
        // (Initial/Loading/Error) Unauthenticated'a çevir.
        if (state is AuthAuthenticated) return;
        state = AuthUnauthenticated();
      } else {
        // Backend-only state varsa Firebase profile override etmesin
        // (birthDate vb. backend alanları silinmesin).
        if (state is AuthAuthenticated) return;
        final profile = await _repository.getUserProfile();
        state = AuthAuthenticated(profile ?? {
          'uid': user.uid,
          'email': user.email,
          'displayName': user.displayName ?? 'Kullanıcı',
        });
        unawaited(FcmService.instance.init());
      }
    });
  }

  /// Phase 256 — Cold-start rehydrate. Token varsa GET /users/me ile profili
  /// çek ve AuthAuthenticated set et; yoksa AuthUnauthenticated.
  Future<void> _rehydrateFromBackend() async {
    try {
      final token = await SecureTokenStore().readToken();
      if (token == null || token.isEmpty) {
        if (state is AuthInitial) state = AuthUnauthenticated();
        return;
      }
      final me = await _profileRepo.getMe();
      state = AuthAuthenticated(me);
      unawaited(FcmService.instance.init());
    } catch (e, st) {
      debugPrint('AuthNotifier._rehydrateFromBackend failed: $e\n$st');
      if (state is AuthInitial) state = AuthUnauthenticated();
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    state = AuthLoading();
    try {
      final data = await _repository.login(email, password);
      state = AuthAuthenticated(
        data['user'] as Map<String, dynamic>? ?? {'displayName': email},
      );
      unawaited(FcmService.instance.init());
      return data;
    } catch (e) {
      state = AuthError(e.toString().replaceFirst('Exception: ', ''));
      return {};
    }
  }

  Future<Map<String, dynamic>> register({
    required String fullName,
    // Phase 253-B — phone optional.
    String? phoneNumber,
    required String password,
    String? email,
    String? city,
    // Eski parametreler — Firebase'de kullanılmıyor ama çağrı arayüzü korunuyor
    String? birthDate,
    String? gender,
    String? district,
    String? address,
  }) async {
    state = AuthLoading();
    try {
      final data = await _repository.register(
        fullName: fullName,
        email: email ?? '',
        password: password,
        phoneNumber: phoneNumber,
        city: city,
      );
      state = AuthAuthenticated(
        data['user'] as Map<String, dynamic>? ?? {'displayName': fullName},
      );
      unawaited(FcmService.instance.init());
      return data;
    } catch (e) {
      state = AuthError(e.toString().replaceFirst('Exception: ', ''));
      rethrow;
    }
  }

  void updateUserData(Map<String, dynamic> user) {
    if (state is AuthAuthenticated) {
      final current = (state as AuthAuthenticated).user;
      state = AuthAuthenticated({...current, ...user});
    }
  }

  Future<void> logout() async {
    await FcmService.instance.unregister();
    await _repository.logout();
    state = AuthUnauthenticated();
  }

  // Eski NestJS 2FA metodları — Firebase'de kullanılmıyor, no-op kalıyor
  Future<void> verify2FALogin(String tempToken, String code) async {}

  /// Google ile giriş — başarılı olunca authStateChanges stream'i
  /// state'i AuthAuthenticated'a çevirir, burada sadece loading + hata.
  Future<Map<String, dynamic>> signInWithGoogle() async {
    state = AuthLoading();
    try {
      final data = await _repository.signInWithGoogle();
      // authStateChanges listener will flip state — but for return-value
      // consumers (router redirect) set it here too.
      state = AuthAuthenticated(
        data['user'] as Map<String, dynamic>? ?? const {},
      );
      unawaited(FcmService.instance.init());
      return data;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('sign_in_canceled')) {
        // Silent cancel — restore previous state.
        state = AuthUnauthenticated();
        return {};
      }
      state = AuthError(msg.replaceFirst('Exception: ', ''));
      return {};
    }
  }

  /// Apple ile giriş — Google ile aynı kontrat.
  Future<Map<String, dynamic>> signInWithApple() async {
    state = AuthLoading();
    try {
      final data = await _repository.signInWithApple();
      state = AuthAuthenticated(
        data['user'] as Map<String, dynamic>? ?? const {},
      );
      unawaited(FcmService.instance.init());
      return data;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('sign_in_canceled')) {
        state = AuthUnauthenticated();
        return {};
      }
      state = AuthError(msg.replaceFirst('Exception: ', ''));
      return {};
    }
  }
}
