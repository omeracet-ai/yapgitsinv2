import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebasePaymentRepositoryProvider = Provider((ref) {
  return FirebasePaymentRepository(fs: FirestoreService.instance);
});

final firebaseEarningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(firebasePaymentRepositoryProvider).getEarnings();
});

class FirebasePaymentRepository {
  final FirestoreService _fs;

  FirebasePaymentRepository({required FirestoreService fs}) : _fs = fs;

  Future<Map<String, dynamic>> getEarnings() async {
    final uid = _fs.uid;
    if (uid == null) {
      return {
        'totalEarnings': 0,
        'monthlyEarnings': 0,
        'weeklyEarnings': 0,
        'completedCount': 0,
        'lastTransactions': [],
      };
    }

    final q = _fs.col('payments').where('workerId', isEqualTo: uid).where('status', isEqualTo: 'completed');
    final docs = await _fs.query(q);

    double total = 0;
    double monthly = 0;
    double weekly = 0;
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));

    for (final d in docs) {
      final amount = (d['amount'] as num?)?.toDouble() ?? 0;
      total += amount;

      dynamic ts = d['completedAt'] ?? d['createdAt'];
      DateTime? date;
      if (ts != null) {
        if (ts is Map && ts['_seconds'] != null) {
          date = DateTime.fromMillisecondsSinceEpoch((ts['_seconds'] as int) * 1000);
        } else {
          date = DateTime.tryParse(ts.toString());
        }
      }

      if (date != null) {
        if (!date.isBefore(startOfMonth)) monthly += amount;
        if (!date.isBefore(startOfWeek)) weekly += amount;
      }
    }

    final last = docs.reversed.take(10).toList();

    return {
      'totalEarnings': total,
      'monthlyEarnings': monthly,
      'weeklyEarnings': weekly,
      'completedCount': docs.length,
      'lastTransactions': last,
    };
  }
}
