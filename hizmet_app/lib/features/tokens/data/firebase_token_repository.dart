import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/services/firestore_service.dart';

final firebaseTokenRepositoryProvider = Provider((ref) {
  return FirebaseTokenRepository(fs: FirestoreService.instance);
});

final firebaseTokenBalanceProvider = FutureProvider<int>((ref) async {
  return ref.watch(firebaseTokenRepositoryProvider).getBalance();
});

/// Aliases so screens that import this file can use the original provider names.
final tokenRepositoryProvider = firebaseTokenRepositoryProvider;
final tokenBalanceProvider = firebaseTokenBalanceProvider;

class FirebaseTokenRepository {
  final FirestoreService _fs;

  FirebaseTokenRepository({required FirestoreService fs}) : _fs = fs;

  Future<int> getBalance() async {
    final uid = _fs.uid;
    if (uid == null) return 0;
    final snap = await _fs.getDoc('token_wallets/$uid');
    return (snap?['balance'] as num?)?.toInt() ?? 0;
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final q = _fs
        .col('token_transactions')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(50);
    return _fs.query(q);
  }

  /// Token satın al: payment_requests'e kayıt ekle; Cloud Function iyzipay ile işler.
  Future<void> purchase(int amount, String paymentMethod) async {
    final uid = _fs.uid;

    await _fs.add('payment_requests', {
      'type': 'token_purchase',
      'userId': uid ?? '',
      'amount': amount,
      'paymentMethod': paymentMethod,
      'status': 'pending',
    });
  }

  Future<String> downloadHistoryPdf({DateTime? from, DateTime? to}) async {
    if (kIsWeb) throw UnsupportedError('PDF indirme web\'de desteklenmiyor');

    final uid = _fs.uid;
    if (uid == null) throw StateError('Giriş yapılmamış');

    Query<Map<String, dynamic>> q = _fs
        .col('token_transactions')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true);

    if (from != null) {
      q = q.where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(from));
    }
    if (to != null) {
      q = q.where('createdAt', isLessThanOrEqualTo: Timestamp.fromDate(to));
    }

    final docs = await _fs.query(q);
    final lines = StringBuffer();
    lines.writeln('Yapgitsin Token Geçmişi');
    lines.writeln('Kullanıcı: $uid');
    lines.writeln('Tarih: ${DateTime.now().toIso8601String()}');
    lines.writeln('---');
    for (final d in docs) {
      lines.writeln(
        '${d['createdAt']} | ${d['type']} | ${d['amount']} token | ${d['status']}',
      );
    }

    final dir = await getApplicationDocumentsDirectory();
    final stamp = DateTime.now().millisecondsSinceEpoch;
    final path = '${dir.path}/yapgitsin-cuzdan-$stamp.txt';
    await File(path).writeAsString(lines.toString());
    return path;
  }

  /// Token hediye et: payment_requests'e kayıt ekle; Cloud Function transferi işler.
  Future<Map<String, dynamic>> giftTokens({
    required String recipientId,
    required int amount,
    String? note,
  }) async {
    final uid = _fs.uid;

    final requestId = await _fs.add('payment_requests', {
      'type': 'token_gift',
      'senderId': uid ?? '',
      'recipientId': recipientId,
      'amount': amount,
      if (note != null && note.isNotEmpty) 'note': note,
      'status': 'pending',
    });

    return {
      'requestId': requestId,
      'recipientId': recipientId,
      'amount': amount,
      'status': 'pending',
      'message': 'Token transferi işleme alındı.',
    };
  }
}
