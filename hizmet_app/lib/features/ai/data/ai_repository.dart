import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final aiRepositoryProvider = Provider((ref) {
  return AiRepository(ref.watch(authRepositoryProvider));
});

class JobAssistantResult {
  final String description;
  final int suggestedBudgetMin;
  final int suggestedBudgetMax;
  final String tips;

  const JobAssistantResult({
    required this.description,
    required this.suggestedBudgetMin,
    required this.suggestedBudgetMax,
    required this.tips,
  });

  factory JobAssistantResult.fromJson(Map<String, dynamic> json) =>
      JobAssistantResult(
        description: json['description'] as String? ?? '',
        suggestedBudgetMin: (json['suggestedBudgetMin'] as num?)?.toInt() ?? 0,
        suggestedBudgetMax: (json['suggestedBudgetMax'] as num?)?.toInt() ?? 0,
        tips: json['tips'] as String? ?? '',
      );
}

class PricingAdvisorResult {
  final int budgetMin;
  final int budgetMax;
  final String rationale;

  const PricingAdvisorResult({
    required this.budgetMin,
    required this.budgetMax,
    required this.rationale,
  });

  factory PricingAdvisorResult.fromJson(Map<String, dynamic> json) =>
      PricingAdvisorResult(
        budgetMin: (json['budgetMin'] as num?)?.toInt() ?? 0,
        budgetMax: (json['budgetMax'] as num?)?.toInt() ?? 0,
        rationale: json['rationale'] as String? ?? '',
      );
}

class AiRepository {
  final AuthRepository _auth;
  late final Dio _dio;

  AiRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 120),
        ));

  Future<Options> _authOptions() async {
    final token = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  /// Generates a job description only (lighter than jobAssistant).
  /// Backend: POST /ai/generate-job-description → { description }
  Future<String> generateDescription({
    required String title,
    String? category,
    String? location,
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/generate-job-description',
        data: {
          'title': title,
          if (category != null) 'category': category,
          if (location != null) 'location': location,
        },
        options: await _authOptions(),
      );
      return (resp.data as Map<String, dynamic>)['description'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'AI açıklama üretemedi');
    }
  }

  /// İlan Asistanı: generates job description + budget suggestion
  Future<JobAssistantResult> jobAssistant({
    required String title,
    String? category,
    String? location,
    double? budgetHint,
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/job-assistant',
        data: {
          'title': title,
          if (category != null) 'category': category,
          if (location != null) 'location': location,
          if (budgetHint != null) 'budgetHint': budgetHint,
        },
        options: await _authOptions(),
      );
      return JobAssistantResult.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'İlan asistanı başarısız oldu');
    }
  }

  /// Fiyat Danışmanı: suggests price range for a category
  Future<PricingAdvisorResult> pricingAdvisor({
    required String category,
    required String jobDetails,
    String? location,
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/pricing-advisor',
        data: {
          'category': category,
          'jobDetails': jobDetails,
          if (location != null) 'location': location,
        },
        options: await _authOptions(),
      );
      return PricingAdvisorResult.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fiyat danışmanı başarısız oldu');
    }
  }

  /// AI Chat (Yapgitsin Asistan): general purpose chat — uses /ai/chat
  Future<String> chat({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/chat',
        data: {
          'message': message,
          if (history.isNotEmpty) 'history': history,
        },
        options: await _authOptions(),
      );
      return (resp.data as Map<String, dynamic>)['reply'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'AI sohbet başarısız oldu');
    }
  }

  /// Destek Ajanı: multi-turn support chat
  Future<String> supportAgent({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/support-agent',
        data: {
          'message': message,
          if (history.isNotEmpty) 'history': history,
        },
        options: await _authOptions(),
      );
      return (resp.data as Map<String, dynamic>)['reply'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Destek ajanı başarısız oldu');
    }
  }
}
