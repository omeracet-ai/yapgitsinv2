// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseCategoryRepositoryProvider = Provider((ref) {
  return FirebaseCategoryRepository();
});

final firebaseCategoriesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(firebaseCategoryRepositoryProvider).getCategories();
});

class FirebaseCategoryRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final query = _fs
          .col('categories')
          .where('isActive', isEqualTo: true)
          .orderBy('sortOrder');
      return await _fs.query(query);
    } catch (_) {
      return [];
    }
  }
}
