// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseStatementRepoProvider =
    Provider((_) => FirebaseStatementRepository());

final firebaseStatementProvider = FutureProvider.family
    .autoDispose<Map<String, dynamic>, ({int year, int month})>((ref, period) {
  return ref.read(firebaseStatementRepoProvider).getMonthly(period.year, period.month);
});

class FirebaseStatementRepository {
  final _fs = FirestoreService.instance;

  Future<Map<String, dynamic>> getMonthly(int year, int month) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Oturum bulunamadı');

    final mm = month.toString().padLeft(2, '0');
    final monthStr = '$year-$mm';

    final start = Timestamp.fromDate(DateTime(year, month, 1));
    final end = Timestamp.fromDate(DateTime(year, month + 1, 1));

    final payments = await _fs.query(
      _fs.col('payments')
          .where('workerId', isEqualTo: uid)
          .where('status', isEqualTo: 'completed')
          .where('createdAt', isGreaterThanOrEqualTo: start)
          .where('createdAt', isLessThan: end),
    );

    double earned = 0, commission = 0;
    for (final p in payments) {
      earned += ((p['amount'] as num?) ?? 0).toDouble();
      commission += ((p['commission'] as num?) ?? 0).toDouble();
    }

    return {
      'year': year,
      'month': monthStr,
      'totalEarned': earned,
      'totalCommission': commission,
      'net': earned - commission,
      'transactionCount': payments.length,
      'transactions': payments,
    };
  }

  String getMonthlyCsvUrl(int year, int month) => '';
}
