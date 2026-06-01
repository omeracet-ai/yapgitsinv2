// Phase 334 — İş tamamlandıktan sonra yazılmamış değerlendirmeler için
// app-launch popup. Backend `/reviews/pending` döner; kullanıcı her satıra
// "Şimdi Değerlendir" ile tıklar → WriteReviewSheet açılır.
//
// Anti-rahatsızlık: kullanıcı kapattıktan sonra 24 saat tekrar gösterilmez
// (`SharedPreferences['pendingReviewsDismissedAt']` damgası).

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/network/api_client_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../screens/write_review_screen.dart';

/// Kalıcı state — 24h cooldown timestamp anahtarı.
const _kDismissedKey = 'pendingReviewsDismissedAt';
const Duration _kCooldown = Duration(hours: 24);

class PendingReviewItem {
  final String jobId;
  final String jobTitle;
  final String revieweeId;
  final String revieweeName;
  final String completedAt;

  const PendingReviewItem({
    required this.jobId,
    required this.jobTitle,
    required this.revieweeId,
    required this.revieweeName,
    required this.completedAt,
  });

  factory PendingReviewItem.fromMap(Map<String, dynamic> m) {
    return PendingReviewItem(
      jobId: m['jobId']?.toString() ?? '',
      jobTitle: m['jobTitle']?.toString() ?? '',
      revieweeId: m['revieweeId']?.toString() ?? '',
      revieweeName: m['revieweeName']?.toString() ?? 'Kullanıcı',
      completedAt: m['completedAt']?.toString() ?? '',
    );
  }
}

/// Provider — bekleyen değerlendirmeleri çeker. Best-effort: 401/404
/// hatalarında boş liste döner ki popup hiç açılmasın.
final pendingReviewsProvider =
    FutureProvider.autoDispose<List<PendingReviewItem>>((ref) async {
  try {
    final dio = ref.read(apiClientProvider).dio;
    final res = await dio.get('/reviews/pending');
    final list = res.data;
    if (list is! List) return const [];
    return list
        .whereType<Map>()
        .map((m) => PendingReviewItem.fromMap(Map<String, dynamic>.from(m)))
        .where((it) => it.jobId.isNotEmpty && it.revieweeId.isNotEmpty)
        .toList(growable: false);
  } catch (_) {
    return const [];
  }
});

/// Cooldown kontrolü — son dismiss üzerinden 24h geçtiyse popup'ı tekrar açabilir.
Future<bool> _isInCooldown() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final stamp = prefs.getInt(_kDismissedKey);
    if (stamp == null) return false;
    final last = DateTime.fromMillisecondsSinceEpoch(stamp);
    return DateTime.now().difference(last) < _kCooldown;
  } catch (_) {
    return false;
  }
}

Future<void> _markDismissed() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _kDismissedKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  } catch (_) {
    /* best-effort */
  }
}

/// MainShell'den çağrılır. Popup için tüm guard'lar burada:
/// - cooldown
/// - bekleyen liste boş mu
/// - hâlâ mounted mı
Future<void> maybeShowPendingReviewsPopup(
  BuildContext context,
  WidgetRef ref,
) async {
  if (await _isInCooldown()) return;
  final items = await ref.read(pendingReviewsProvider.future);
  if (items.isEmpty) return;
  if (!context.mounted) return;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _PendingReviewsSheet(items: items),
  );
  // Modal'dan döndüğünde damga at — 24h pause.
  await _markDismissed();
}

class _PendingReviewsSheet extends ConsumerWidget {
  final List<PendingReviewItem> items;
  const _PendingReviewsSheet({required this.items});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      expand: false,
      builder: (ctx, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.rate_review_outlined,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Değerlendirmeni bekleyen ${items.length} iş',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                IconButton(
                  tooltip: 'Daha sonra',
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Birkaç dakikanı ayır, karşı tarafa yardımcı ol.',
              style: TextStyle(
                  fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final it = items[i];
                  return _PendingTile(item: it, onReviewed: () {
                    // Tek satır kapandığında provider'ı tazele, liste boş
                    // kalırsa modal'ı otomatik kapat.
                    ref.invalidate(pendingReviewsProvider);
                    if (items.length <= 1 && ctx.mounted) {
                      Navigator.of(ctx).pop();
                    }
                  });
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PendingTile extends StatelessWidget {
  final PendingReviewItem item;
  final VoidCallback onReviewed;
  const _PendingTile({required this.item, required this.onReviewed});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Text(
              item.revieweeName.isNotEmpty
                  ? item.revieweeName[0].toUpperCase()
                  : '?',
              style: const TextStyle(
                  color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.jobTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(item.revieweeName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: () async {
              await showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => WriteReviewSheet(
                  revieweeId: item.revieweeId,
                  revieweeName: item.revieweeName,
                  jobId: item.jobId,
                ),
              );
              onReviewed();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
              textStyle: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700),
            ),
            child: const Text('Değerlendir'),
          ),
        ],
      ),
    );
  }
}
