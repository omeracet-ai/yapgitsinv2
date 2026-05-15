// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseMessageTemplatesRepositoryProvider =
    Provider((_) => FirebaseMessageTemplatesRepository());

final firebaseMessageTemplatesProvider =
    FutureProvider<List<Map<String, dynamic>>>(
        (ref) => ref.read(firebaseMessageTemplatesRepositoryProvider).getAll());

class FirebaseMessageTemplatesRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getAll() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final docs = await _fs.query(
      _fs.col('message_templates')
          .where('userId', isEqualTo: uid)
          .orderBy('createdAt', descending: false),
    );
    return docs;
  }

  Future<Map<String, dynamic>> create(String text, {String? category}) async {
    final uid = _fs.uid!;
    final id = await _fs.add('message_templates', {
      'userId': uid,
      'text': text,
      if (category != null) 'category': category,
    });
    return {'id': id, 'text': text};
  }

  Future<void> delete(String id) => _fs.delete('message_templates/$id');

  Future<Map<String, dynamic>> update(String id, String text) async {
    await _fs.update('message_templates/$id', {'text': text});
    return {'id': id, 'text': text};
  }
}
