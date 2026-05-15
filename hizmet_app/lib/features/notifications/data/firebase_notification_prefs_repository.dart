import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

/// Map<String, bool> with 5 known keys: booking, offer, review, message, system.
typedef NotificationPrefs = Map<String, bool>;

const List<String> kNotificationPrefKeys = [
  'booking',
  'offer',
  'review',
  'message',
  'system',
];

NotificationPrefs allEnabledPrefs() =>
    {for (final k in kNotificationPrefKeys) k: true};

// ─── Notification model ───────────────────────────────────────────────────────

class AppNotification {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic> payload;

  const AppNotification({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.payload = const {},
  });

  factory AppNotification.fromFirestore(Map<String, dynamic> data) {
    return AppNotification(
      id: data['id'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      type: data['type'] as String? ?? '',
      title: data['title'] as String? ?? '',
      body: data['body'] as String? ?? '',
      read: (data['read'] as bool?) ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      payload: Map<String, dynamic>.from(
        (data['payload'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

class FirebaseNotificationPrefsRepository {
  FirebaseNotificationPrefsRepository(this._fs);
  final FirestoreService _fs;

  String? get _uid => _fs.uid;

  // ── Notification preferences ──────────────────────────────────────────────

  Future<NotificationPrefs> fetch() async {
    final uid = _uid;
    if (uid == null) return allEnabledPrefs();

    final data = await _fs.getDoc('users/$uid/settings/notificationPrefs');
    if (data == null) return allEnabledPrefs();
    return _parse(data['preferences']);
  }

  Future<NotificationPrefs> update(NotificationPrefs prefs) async {
    final uid = _uid;
    if (uid == null) return prefs;

    final ref = _fs.doc('users/$uid/settings/notificationPrefs');
    final snap = await ref.get();
    if (snap.exists) {
      await ref.update({'preferences': prefs, 'updatedAt': _fs.serverNow});
    } else {
      await ref.set({
        'preferences': prefs,
        'createdAt': _fs.serverNow,
        'updatedAt': _fs.serverNow,
      });
    }
    return prefs;
  }

  // ── In-app notifications ──────────────────────────────────────────────────

  /// Real-time stream of notifications for current user, newest first.
  Stream<List<AppNotification>> getNotificationsStream() {
    final uid = _uid;
    if (uid == null) return const Stream.empty();

    final q = _fs
        .col('notifications')
        .where('userId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(50);

    return q.snapshots().map((snap) => snap.docs
        .map((d) => AppNotification.fromFirestore({'id': d.id, ...d.data()}))
        .toList());
  }

  /// Count of unread notifications for current user.
  Stream<int> getUnreadCountStream() {
    final uid = _uid;
    if (uid == null) return Stream.value(0);

    final q = _fs
        .col('notifications')
        .where('userId', isEqualTo: uid)
        .where('read', isEqualTo: false);

    return q.snapshots().map((snap) => snap.docs.length);
  }

  /// Mark a single notification as read.
  Future<void> markRead(String notifId) async {
    await _fs.update('notifications/$notifId', {'read': true});
  }

  /// Mark all unread notifications for current user as read.
  Future<void> markAllRead() async {
    final uid = _uid;
    if (uid == null) return;

    final snap = await _fs
        .col('notifications')
        .where('userId', isEqualTo: uid)
        .where('read', isEqualTo: false)
        .get();

    if (snap.docs.isEmpty) return;

    final batch = _fs.db.batch();
    for (final doc in snap.docs) {
      batch.update(doc.reference, {'read': true});
    }
    await batch.commit();
  }

  // ── FCM token management ──────────────────────────────────────────────────

  /// Save or refresh the FCM device token for current user.
  Future<void> saveFcmToken(String token) async {
    final uid = _uid;
    if (uid == null) return;
    await _fs.doc('users/$uid').update({'fcmToken': token});
  }

  /// Remove FCM token on logout/unsubscribe.
  Future<void> removeFcmToken() async {
    final uid = _uid;
    if (uid == null) return;
    await _fs.db.doc('users/$uid').update({
      'fcmToken': FieldValue.delete(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  NotificationPrefs _parse(dynamic raw) {
    final result = allEnabledPrefs();
    if (raw is Map) {
      for (final k in kNotificationPrefKeys) {
        final v = raw[k];
        if (v is bool) result[k] = v;
      }
    }
    return result;
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────

final firebaseNotificationPrefsRepositoryProvider =
    Provider<FirebaseNotificationPrefsRepository>((ref) {
  return FirebaseNotificationPrefsRepository(FirestoreService.instance);
});

final notificationPrefsProvider =
    FutureProvider.autoDispose<NotificationPrefs>((ref) async {
  return ref.read(firebaseNotificationPrefsRepositoryProvider).fetch();
});

final notificationsStreamProvider =
    StreamProvider.autoDispose<List<AppNotification>>((ref) {
  return ref
      .read(firebaseNotificationPrefsRepositoryProvider)
      .getNotificationsStream();
});

final unreadNotifCountProvider = StreamProvider.autoDispose<int>((ref) {
  return ref
      .read(firebaseNotificationPrefsRepositoryProvider)
      .getUnreadCountStream();
});
