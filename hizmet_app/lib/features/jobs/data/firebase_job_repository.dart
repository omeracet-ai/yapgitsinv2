// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/firestore_service.dart';

final firebaseJobRepositoryProvider = Provider((ref) {
  return FirebaseJobRepository();
});

final jobDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.watch(firebaseJobRepositoryProvider).getJobDetail(id);
});

class FirebaseJobRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getJobs({String? category, String? q}) async {
    try {
      Query<Map<String, dynamic>> query =
          _fs.col('jobs').where('status', isEqualTo: 'active');
      if (category != null && category.isNotEmpty) {
        query = query.where('category', isEqualTo: category);
      }
      final results = await _fs.query(query.limit(100));
      if (q != null && q.trim().isNotEmpty) {
        final lower = q.trim().toLowerCase();
        return results
            .where((j) =>
                (j['title'] as String? ?? '').toLowerCase().contains(lower) ||
                (j['description'] as String? ?? '').toLowerCase().contains(lower))
            .toList();
      }
      return results;
    } catch (e) {
      throw Exception('İlanlar yüklenemedi: $e');
    }
  }

  Future<Map<String, dynamic>> createJob(Map<String, dynamic> jobData) async {
    try {
      final uid = _fs.uid;
      final id = await _fs.add('jobs', {
        ...jobData,
        'customerId': uid,
        'status': 'active',
      });
      return {'id': id, ...jobData};
    } catch (e) {
      throw Exception('İlan oluşturulamadı: $e');
    }
  }

  Future<Map<String, dynamic>> getJobDetail(String id) async {
    try {
      final data = await _fs.getDoc('jobs/$id');
      if (data == null) throw Exception('Kayıt bulunamadı.');
      return data;
    } catch (e) {
      throw Exception('İlan detayı yüklenemedi: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getMyJobs(String customerId) async {
    try {
      final query = _fs
          .col('jobs')
          .where('customerId', isEqualTo: customerId)
          .limit(100);
      return await _fs.query(query);
    } catch (e) {
      throw Exception('İlanlar yüklenemedi: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getJobQuestions(String jobId) async {
    try {
      final query = _fs
          .col('jobs/$jobId/questions')
          .orderBy('createdAt', descending: false);
      return await _fs.query(query);
    } catch (e) {
      throw Exception('Sorular yüklenemedi: $e');
    }
  }

  Future<void> postJobQuestion(String jobId, String text,
      {String? photoUrl}) async {
    try {
      await _fs.add('jobs/$jobId/questions', {
        'text': text,
        'userId': _fs.uid,
        if (photoUrl != null) 'photoUrl': photoUrl,
      });
    } catch (e) {
      throw Exception('Soru gönderilemedi: $e');
    }
  }

  Future<Map<String, dynamic>> boostJob(String jobId, int days) async {
    try {
      final featuredUntil =
          DateTime.now().add(Duration(days: days)).toIso8601String();
      await _fs.update('jobs/$jobId', {
        'isFeatured': true,
        'featuredUntil': featuredUntil,
      });
      return {'jobId': jobId, 'days': days, 'featuredUntil': featuredUntil};
    } catch (e) {
      throw Exception('İlan öne çıkarılamadı: $e');
    }
  }

  Future<void> postQuestionReply(
      String jobId, String questionId, String text) async {
    try {
      await _fs.add('jobs/$jobId/questions/$questionId/replies', {
        'text': text,
        'userId': _fs.uid,
      });
    } catch (e) {
      throw Exception('Yanıt gönderilemedi: $e');
    }
  }

  Future<List<String>> uploadJobPhotosBulk(
      String jobId, List<XFile> photos) async {
    try {
      final urls = <String>[];
      for (final f in photos) {
        final bytes = await f.readAsBytes();
        final ref = _fs.storage
            .ref('job_photos/$jobId/${DateTime.now().millisecondsSinceEpoch}_${f.name}');
        final task = await ref.putData(bytes);
        final url = await task.ref.getDownloadURL();
        urls.add(url);
      }
      await _fs.update('jobs/$jobId', {'photos': FieldValue.arrayUnion(urls)});
      return urls;
    } catch (e) {
      throw Exception('Fotoğraflar yüklenemedi: $e');
    }
  }

  Future<List<String>> uploadCompletionPhotos(
      String jobId, List<XFile> files) async {
    try {
      final urls = <String>[];
      for (final f in files) {
        final bytes = await f.readAsBytes();
        final ref = _fs.storage
            .ref('completion_photos/$jobId/${DateTime.now().millisecondsSinceEpoch}_${f.name}');
        final task = await ref.putData(bytes);
        final url = await task.ref.getDownloadURL();
        urls.add(url);
      }
      await _fs.update('jobs/$jobId', {
        'completionPhotos': FieldValue.arrayUnion(urls),
      });
      return urls;
    } catch (e) {
      throw Exception('Tamamlama fotoğrafları yüklenemedi: $e');
    }
  }
}
