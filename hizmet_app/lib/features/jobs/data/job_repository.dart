import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client_provider.dart';

final jobRepositoryProvider = Provider((ref) {
  return JobRepository(dio: ref.read(apiClientProvider).dio);
});

/// Tam detay: customer bilgisi dahil
final jobDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.watch(jobRepositoryProvider).getJobDetail(id);
});

class JobRepository {
  final Dio _dio;

  JobRepository({required Dio dio}) : _dio = dio;

  /// Backend yanıt şekline dayanıklı liste çıkarımı: hem paginated
  /// `{ data: [...] }` hem de düz `[...]` döndüren ortamları destekler.
  /// (Aksi halde düz liste dönen bir backend'de `data['data']` →
  /// "type 'String' is not a subtype of type 'int' of 'index'" hatası olur.)
  List<Map<String, dynamic>> _extractJobList(dynamic data) {
    final List<dynamic> raw = data is List
        ? data
        : (data is Map && data['data'] is List
            ? data['data'] as List
            : const <dynamic>[]);
    return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> getJobs(
      {String? category,
      String? q,
      String? status,
      String? kind,
      double? lat,
      double? lng,
      double? radiusKm}) async {
    try {
      final response = await _dio.get('/jobs', queryParameters: {
        if (category != null) 'category': category,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        if (status != null) 'status': status,
        if (kind != null) 'kind': kind,
        // Proximity sıralaması (backend featured→yakın→yeni). Konum varsa gönder.
        if (lat != null && lng != null) 'lat': lat,
        if (lat != null && lng != null) 'lng': lng,
        // Phase 301 — Mesafe filtresi: radius+lat/lng beraber gönderilince
        // server-side Haversine ile sınırlanır.
        if (radiusKm != null && lat != null && lng != null)
          'radiusKm': radiusKm,
      });
      return _extractJobList(response.data);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> createJob(Map<String, dynamic> jobData) async {
    // Phase 265e — Backend Phase 263+ deploy edilmediyse `targetWorkerId` ve
    // `scheduleFlexibility` alanlarını "should not exist" diye reddediyor.
    // 400 + bilinmeyen-alan hatası gelirse opsiyonel alanları çıkar, yeniden
    // dene. Eski/yeni backend ikisinde de çalışır.
    Future<Map<String, dynamic>> post(Map<String, dynamic> body) async {
      final res = await _dio.post('/jobs', data: body);
      return res.data as Map<String, dynamic>;
    }

    try {
      return await post(jobData);
    } on DioException catch (e) {
      final msgs = e.response?.data?['message'];
      final unknownField = msgs is List &&
          msgs.any((m) =>
              m is String && m.contains('should not exist'));
      if (e.response?.statusCode == 400 && unknownField) {
        // Geriye uyumluluk fallback — Phase 265 field'larını çıkar
        final clean = Map<String, dynamic>.from(jobData)
          ..remove('targetWorkerId')
          ..remove('scheduleFlexibility')
          // Phase 266 — eski backend bilinmiyor olabilir
          ..remove('dueTime')
          ..remove('dueAnyTime')
          // Phase 505 — eski backend taslak alanını bilmiyor olabilir
          ..remove('isDraft');
        try {
          return await post(clean);
        } on DioException catch (e2) {
          throw Exception(_dioMsg(e2, 'İlan oluşturulamadı'));
        }
      }
      throw Exception(_dioMsg(e, 'İlan oluşturulamadı'));
    }
  }

  Future<Map<String, dynamic>> getJobDetail(String id) async {
    try {
      final response = await _dio.get('/jobs/$id');
      final data = response.data;
      // Phase 540j — belirsiz response tipi (backend paginated envelope
      // döndürmeye başlarsa) yerine null → boş obje fallback + type gate.
      if (data is Map<String, dynamic>) return data;
      throw Exception('İlan detayı beklenmeyen formatta döndü');
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan detayı yüklenemedi'));
    }
  }

  /// Müşterinin kendi ilanları.
  /// [isDraft] null → hem yayın hem taslak (eski davranış)
  ///           true → sadece taslaklar
  ///           false → sadece yayınlananlar
  Future<List<Map<String, dynamic>>> getMyJobs(
    String customerId, {
    bool? isDraft,
  }) async {
    try {
      final response = await _dio.get(
        '/jobs',
        queryParameters: {
          'customerId': customerId,
          if (isDraft != null) 'isDraft': isDraft.toString(),
        },
      );
      return _extractJobList(response.data);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  /// Phase 505 — Müşterinin kendi taslakları (yayında değil).
  Future<List<Map<String, dynamic>>> getMyDrafts(String customerId) {
    return getMyJobs(customerId, isDraft: true);
  }

  /// Phase 505 — Taslak ilanı yayına alır (`isDraft=false`).
  Future<Map<String, dynamic>> publishDraft(String jobId) async {
    try {
      final res = await _dio.patch('/jobs/$jobId', data: {'isDraft': false});
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Taslak yayınlanamadı'));
    }
  }

  Future<List<Map<String, dynamic>>> getJobQuestions(String jobId) async {
    try {
      final response = await _dio.get('/jobs/$jobId/questions');
      // Phase 540j — backend hem düz List hem {data: [...]} envelope
      // dönebilir. İkisini de destekle; başka format → boş liste.
      final raw = response.data;
      final list = raw is List
          ? raw
          : (raw is Map && raw['data'] is List ? raw['data'] as List : null);
      if (list == null) return const [];
      return list
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList();
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Sorular yüklenemedi'));
    }
  }

  Future<void> postJobQuestion(String jobId, String text, {String? photoUrl}) async {
    try {
      await _dio.post(
        '/jobs/$jobId/questions',
        data: {'text': text, if (photoUrl != null) 'photoUrl': photoUrl},
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Soru gönderilemedi'));
    }
  }

  /// Boost a job — backend keser token ve featuredUntil set eder
  Future<Map<String, dynamic>> boostJob(String jobId, int days) async {
    try {
      final response = await _dio.post(
        '/jobs/$jobId/boost',
        data: {'days': days},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan öne çıkarılamadı'));
    }
  }

  Future<void> postQuestionReply(String jobId, String questionId, String text) async {
    try {
      await _dio.post(
        '/jobs/$jobId/questions/$questionId/replies',
        data: {'text': text},
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Yanıt gönderilemedi'));
    }
  }

  /// Phase 203 — İş ilanı bulk fotoğraf yükle (max 5, XFile → bytes, tek request)
  Future<List<String>> uploadJobPhotosBulk(String jobId, List<XFile> photos) async {
    try {
      final form = FormData();
      for (final f in photos) {
        form.files.add(MapEntry(
          'photos',
          MultipartFile.fromBytes(await f.readAsBytes(), filename: f.name),
        ));
      }
      final res = await _dio.post('/uploads/job-photos', data: form);
      return List<String>.from(res.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Fotoğraflar yüklenemedi'));
    }
  }

  /// Tamamlama fotoğrafları yükle (atanan usta + in_progress/pending_completion)
  Future<List<String>> uploadCompletionPhotos(String jobId, List<XFile> files) async {
    try {
      final form = FormData();
      for (final f in files) {
        form.files.add(MapEntry(
          'photos',
          MultipartFile.fromBytes(await f.readAsBytes(), filename: f.name),
        ));
      }
      final res = await _dio.post(
        '/uploads/completion-photos/$jobId',
        data: form,
      );
      // Phase 540j — response.data null / photos alanı eksik olabilir.
      final data = res.data;
      if (data is Map && data['photos'] is List) {
        return (data['photos'] as List).map((e) => e.toString()).toList();
      }
      return const [];
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Tamamlama fotoğrafları yüklenemedi'));
    }
  }

  /// Ortak DioException mesaj yardımcısı
  String _dioMsg(DioException e, String fallback) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (statusCode == 403) return 'Bu işlem için yetkiniz yok.';
    if (statusCode == 404) return 'Kayıt bulunamadı.';
    if (statusCode == 400) {
      final msg = e.response?.data?['message'];
      return msg?.toString() ?? 'Geçersiz istek.';
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
    }
    final msg = e.response?.data?['message'];
    return msg?.toString() ?? fallback;
  }
}
