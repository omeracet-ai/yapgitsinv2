import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_constants.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());

class AuthRepository {
  final Dio _dio;

  AuthRepository()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

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
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', response.data['access_token']);
        if (response.data['user'] != null) {
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
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', response.data['access_token']);
        if (response.data['user'] != null) {
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
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', response.data['access_token']);
        if (response.data['user'] != null) {
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

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_data');
  }

  Future<String?> getToken() async {
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
