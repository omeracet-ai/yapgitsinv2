import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_repository.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

abstract class AuthState { const AuthState(); }
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;
  const AuthAuthenticated(this.user);
  String get displayName => (user['fullName'] ?? 'Kullanıcı') as String;
}
class AuthUnauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  AuthNotifier(this._repository) : super(AuthInitial()) { _checkToken(); }

  Future<void> _checkToken() async {
    final token = await _repository.getToken();
    if (token != null) {
      final userData = await _repository.getUserData();
      state = AuthAuthenticated(userData ?? {'fullName': 'Kullanıcı'});
    } else {
      state = AuthUnauthenticated();
    }
  }

  Future<void> login(String emailOrPhone, String password) async {
    state = AuthLoading();
    try {
      final data = await _repository.login(emailOrPhone, password);
      state = AuthAuthenticated(data['user'] as Map<String, dynamic>? ?? {'fullName': emailOrPhone});
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  Future<Map<String, dynamic>> register({
    required String fullName,
    required String phoneNumber,
    required String password,
    String? email,
    String? birthDate,
    String? gender,
    String? city,
    String? district,
    String? address,
  }) async {
    state = AuthLoading();
    try {
      final data = await _repository.register(
        fullName: fullName,
        phoneNumber: phoneNumber,
        password: password,
        email: email,
        birthDate: birthDate,
        gender: gender,
        city: city,
        district: district,
        address: address,
      );
      state = AuthAuthenticated(data['user'] as Map<String, dynamic>? ?? {'fullName': fullName});
      return data;
    } catch (e) {
      state = AuthError(e.toString());
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
    await _repository.logout();
    state = AuthUnauthenticated();
  }
}
