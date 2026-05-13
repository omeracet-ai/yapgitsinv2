import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final aiRepositoryProvider = Provider((ref) {
  return AiRepository(dio: ref.read(apiClientProvider).dio);
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

class PriceSuggestion {
  final double minPrice;
  final double maxPrice;
  final double medianPrice;
  final String confidence; // 'low' | 'medium' | 'high'
  final String reasoning;
  final String currency;

  const PriceSuggestion({
    required this.minPrice,
    required this.maxPrice,
    required this.medianPrice,
    required this.confidence,
    required this.reasoning,
    required this.currency,
  });

  factory PriceSuggestion.fromJson(Map<String, dynamic> json) =>
      PriceSuggestion(
        minPrice: (json['minPrice'] as num?)?.toDouble() ?? 0,
        maxPrice: (json['maxPrice'] as num?)?.toDouble() ?? 0,
        medianPrice: (json['medianPrice'] as num?)?.toDouble() ?? 0,
        confidence: json['confidence'] as String? ?? 'medium',
        reasoning: json['reasoning'] as String? ?? '',
        currency: json['currency'] as String? ?? 'TRY',
      );
}

class AiRepository {
  final Dio _dio;

  AiRepository({required Dio dio}) : _dio = dio;

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
      );
      return PricingAdvisorResult.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fiyat danışmanı başarısız oldu');
    }
  }

  /// Phase 140: Smart price suggestion — public endpoint (no auth required).
  /// POST /ai/price-suggest → { minPrice, maxPrice, medianPrice, confidence, reasoning, currency }
  Future<PriceSuggestion> suggestPrice({
    required String category,
    required String description,
    String? location,
    List<String>? photos,
    String? customerType,
  }) async {
    try {
      final resp = await _dio.post(
        '/ai/price-suggest',
        data: {
          'category': category,
          'description': description,
          if (location != null && location.isNotEmpty) 'location': location,
          if (photos != null && photos.isNotEmpty) 'photos': photos,
          if (customerType != null) 'customerType': customerType,
        },
      );
      return PriceSuggestion.fromJson(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? (e.response?.data as Map)['message']?.toString()
          : null;
      throw Exception(msg ?? 'AI fiyat önerisi alınamadı');
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
      );
      return (resp.data as Map<String, dynamic>)['reply'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'AI sohbet başarısız oldu');
    }
  }

  /// Yorumları özetler — Backend: POST /ai/summarize-reviews { reviews } → { summary }
  Future<String> summarizeReviews(List<String> reviews) async {
    try {
      final resp = await _dio.post(
        '/ai/summarize-reviews',
        data: {'reviews': reviews},
      );
      return (resp.data as Map<String, dynamic>)['summary'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Yorum özeti alınamadı');
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
      );
      return (resp.data as Map<String, dynamic>)['reply'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Destek ajanı başarısız oldu');
    }
  }
}
