import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/secure_token_store.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());

class AuthRepository {
  final Dio _dio;
  final SecureTokenStore _secureTokenStore;

  /// Tracks whether the one-shot SharedPreferences → SecureStorage migration
  /// has run for this app process. Idempotent across calls.
  static bool _migrationChecked = false;

  AuthRepository({SecureTokenStore? secureTokenStore})
      : _secureTokenStore = secureTokenStore ?? SecureTokenStore(),
        _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  /// One-shot migration (Phase 187/5): if the secure store has no token but
  /// the legacy SharedPreferences store does, copy it over. Uses a
  /// write-through pattern — the SP entry is intentionally NOT removed so
  /// Voldi-sec-1's ApiClient interceptor (which still reads SP directly)
  /// keeps working until its own migration lands.
  Future<void> _ensureTokenMigration() async {
    if (_migrationChecked) return;
    _migrationChecked = true;
    try {
      final secure = await _secureTokenStore.readToken();
      if (secure != null && secure.isNotEmpty) return;
      final prefs = await SharedPreferences.getInstance();
      final legacy = prefs.getString('jwt_token');
      if (legacy != null && legacy.isNotEmpty) {
        await _secureTokenStore.writeToken(legacy);
        // Write-through: keep SP value for Voldi-sec-1 interceptor compat.
      }
    } catch (_) {
      // Best-effort migration; never block auth flows on shim failure.
    }
  }

  /// Persist the access token to both secure storage (primary) and the legacy
  /// SharedPreferences `jwt_token` key (write-through, for Voldi-sec-1 compat).
  Future<void> _persistToken(String token) async {
    await _secureTokenStore.writeToken(token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  /// Phase P188/4 — Persist BOTH access + refresh tokens from a login response.
  /// Refresh token only goes to secure storage (never SP) since it never had a
  /// legacy SP key to write-through to.
  Future<void> _persistTokensFromResponse(Map<String, dynamic> data) async {
    final access = data['access_token'];
    if (access is String && access.isNotEmpty) {
      await _persistToken(access);
    }
    final refresh = data['refresh_token'];
    if (refresh is String && refresh.isNotEmpty) {
      await _secureTokenStore.writeRefreshToken(refresh);
    }
  }

  Future<Map<String, dynamic>> login(String emailOrPhone, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': emailOrPhone,
        'password': password,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        // 2FA gerekiyorsa token kaydetme — challenge ekranına yönlendirilecek
        if (response.data['requires2FA'] == true) {
          return Map<String, dynamic>.from(response.data);
        }
        await _persistTokensFromResponse(
            Map<String, dynamic>.from(response.data as Map));
        if (response.data['user'] != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('user_data', jsonEncode(response.data['user']));
        }
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Giriş başarısız');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>> verify2FALogin(String tempToken, String code) async {
    try {
      final response = await _dio.post('/auth/2fa/login-verify', data: {
        'tempToken': tempToken,
        'code': code,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        await _persistTokensFromResponse(
            Map<String, dynamic>.from(response.data as Map));
        if (response.data['user'] != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('user_data', jsonEncode(response.data['user']));
        }
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Doğrulama başarısız');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Options> _authOptions() async {
    final token = await getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<Map<String, dynamic>> setup2FA() async {
    try {
      final opts = await _authOptions();
      final response = await _dio.post('/auth/2fa/setup', options: opts);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>> enable2FA(String code) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.post('/auth/2fa/enable',
          data: {'code': code}, options: opts);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>> disable2FA(String code) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.post('/auth/2fa/disable',
          data: {'code': code}, options: opts);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
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
    try {
      final response = await _dio.post('/auth/register', data: {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        'password': password,
        if (email != null && email.isNotEmpty) 'email': email,
        if (birthDate != null) 'birthDate': birthDate,
        if (gender != null) 'gender': gender,
        if (city != null && city.isNotEmpty) 'city': city,
        if (district != null && district.isNotEmpty) 'district': district,
        if (address != null && address.isNotEmpty) 'address': address,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        await _persistTokensFromResponse(
            Map<String, dynamic>.from(response.data as Map));
        if (response.data['user'] != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('user_data', jsonEncode(response.data['user']));
        }
        return response.data;
      }
      throw Exception('Kayıt başarısız');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await _dio.post('/auth/forgot-password', data: {'email': email});
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>> requestEmailVerification() async {
    try {
      final opts = await _authOptions();
      final response =
          await _dio.post('/auth/verify-email/request', options: opts);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<void> confirmEmailVerification(String token) async {
    try {
      await _dio.post('/auth/verify-email/confirm', data: {'token': token});
      // Refresh stored user_data emailVerified flag if present
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('user_data');
      if (raw != null) {
        try {
          final m = Map<String, dynamic>.from(jsonDecode(raw));
          m['emailVerified'] = true;
          await prefs.setString('user_data', jsonEncode(m));
        } catch (_) {}
      }
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<void> resetPassword(String token, String newPassword) async {
    try {
      await _dio.post('/auth/reset-password', data: {
        'token': token,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<Map<String, dynamic>?> updateAvailability(
      Map<String, bool>? schedule) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.patch(
        '/users/me/availability',
        data: {'schedule': schedule},
        options: opts,
      );
      // user_data cache içine availabilitySchedule yaz
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('user_data');
      if (raw != null) {
        try {
          final m = Map<String, dynamic>.from(jsonDecode(raw));
          m['availabilitySchedule'] = schedule;
          await prefs.setString('user_data', jsonEncode(m));
        } catch (_) {}
      }
      return response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : null;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<void> logout() async {
    await _secureTokenStore.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_data');
  }

  /// Kalıcı hesap deaktivasyonu — şifre doğrulaması ile.
  /// 401 → şifre yanlış. Diğer hatalar → bağlantı/server hatası.
  Future<void> deleteAccount(String password) async {
    final token = await getToken();
    if (token == null) {
      throw Exception('Oturum bulunamadı');
    }
    try {
      await _dio.delete(
        '/users/me',
        data: {'password': password},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Şifre yanlış');
      }
      throw Exception('Bağlantı hatası, tekrar deneyin');
    }
  }

  /// KVKK Madde 11 — kullanıcının tüm verilerini JSON olarak indir.
  /// Dönen değer: indirilen dosyanın yolu.
  Future<String> downloadDataExport() async {
    final token = await getToken();
    if (token == null) throw Exception('Oturum bulunamadı');
    try {
      final response = await _dio.get<dynamic>(
        '/users/me/data-export',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          responseType: ResponseType.plain,
        ),
      );
      final body = response.data is String
          ? response.data as String
          : jsonEncode(response.data);
      // MVP: dosyaya yazmak yerine içeriği döndür — UI snackbar'da bilgi verir.
      // path_provider ekli değilse de calls çalışsın.
      return body;
    } on DioException catch (e) {
      throw Exception(e.response?.data?.toString() ?? 'Veri indirilemedi');
    }
  }

  /// KVKK Madde 11 — silme talebi gönder.
  Future<Map<String, dynamic>> requestDataDeletion(String? reason) async {
    final token = await getToken();
    if (token == null) throw Exception('Oturum bulunamadı');
    try {
      final response = await _dio.post(
        '/users/me/data-delete-request',
        data: {if (reason != null && reason.isNotEmpty) 'reason': reason},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? (e.response?.data['message']?.toString() ?? 'Hata')
          : 'Bağlantı hatası';
      throw Exception(msg);
    }
  }

  Future<String?> getToken() async {
    await _ensureTokenMigration();
    final secure = await _secureTokenStore.readToken();
    if (secure != null && secure.isNotEmpty) return secure;
    // Fallback: read legacy SP key (covers cold path before migration ran).
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('user_data');
    if (raw == null) return null;
    try { return Map<String, dynamic>.from(jsonDecode(raw)); } catch (_) { return null; }
  }
}
