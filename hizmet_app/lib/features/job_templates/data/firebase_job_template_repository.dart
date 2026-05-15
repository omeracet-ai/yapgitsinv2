// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseJobTemplateRepositoryProvider =
    Provider((_) => FirebaseJobTemplateRepository());

final firebaseJobTemplatesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>(
        (ref) => ref.read(firebaseJobTemplateRepositoryProvider).listMy());

class FirebaseJobTemplateRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> listMy() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    return _fs.query(
      _fs.col('job_templates')
          .where('userId', isEqualTo: uid)
          .orderBy('createdAt', descending: true),
    );
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> dto) async {
    final uid = _fs.uid!;
    final id = await _fs.add('job_templates', {...dto, 'userId': uid});
    return {'id': id, ...dto};
  }

  Future<Map<String, dynamic>> update(String id, Map<String, dynamic> dto) async {
    await _fs.update('job_templates/$id', dto);
    return {'id': id, ...dto};
  }

  Future<void> delete(String id) => _fs.delete('job_templates/$id');

  Future<Map<String, dynamic>> getDetail(String id) async {
    final doc = await _fs.getDoc('job_templates/$id');
    if (doc == null) throw Exception('Şablon bulunamadı');
    return doc;
  }
}
