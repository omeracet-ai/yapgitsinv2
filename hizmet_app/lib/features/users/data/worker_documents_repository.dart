import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client_provider.dart';

/// Ustalık belgeleri repository'si — `/users/me/documents` ile çalışır.
/// Backend `workerDocuments` simple-json kolonunu yönetir; belge yüklenince
/// `workerCategories`'a otomatik kategori eklenir (status: 'active').
final workerDocumentsRepositoryProvider = Provider((ref) {
  return WorkerDocumentsRepository(dio: ref.read(apiClientProvider).dio);
});

class WorkerDocumentsRepository {
  final Dio _dio;
  WorkerDocumentsRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> list() async {
    final res = await _dio.get('/users/me/documents');
    final docs = (res.data as Map?)?['documents'] as List? ?? const [];
    return docs
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
  }

  Future<Map<String, dynamic>> add({
    required String category,
    required String url,
    String? title,
  }) async {
    final res = await _dio.post('/users/me/documents', data: {
      'category': category,
      'url': url,
      if (title != null && title.isNotEmpty) 'title': title,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> remove(String id) async {
    await _dio.delete('/users/me/documents/$id');
  }

  /// `/uploads/document` endpoint'i — JPEG/PNG/WEBP, max 10MB; URL döner.
  Future<String> uploadFile(XFile file) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(
        await file.readAsBytes(),
        filename: file.name,
      ),
    });
    final res = await _dio.post('/uploads/document', data: form);
    return ((res.data as Map)['url'] ?? '') as String;
  }
}

final myWorkerDocumentsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  return ref.read(workerDocumentsRepositoryProvider).list();
});
