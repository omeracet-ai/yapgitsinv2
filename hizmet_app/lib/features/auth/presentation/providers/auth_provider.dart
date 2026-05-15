import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/firebase_auth_repository.dart';
import '../../../../core/services/fcm_service.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(firebaseAuthRepositoryProvider));
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
  StreamSubscription<dynamic>? _authSub;

  AuthNotifier(this._repository) : super(AuthInitial()) {
    // Firebase Auth state stream — otomatik login/logout takibi
    _authSub = _repository.authStateChanges.listen((user) async {
      if (user == null) {
        state = AuthUnauthenticated();
      } else {
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
    required String phoneNumber,
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
