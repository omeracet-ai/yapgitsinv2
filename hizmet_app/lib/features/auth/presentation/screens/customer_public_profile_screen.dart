import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client_provider.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/stat_info_popup.dart';
import '../../data/customer_profile_repository.dart';

/// Phase 133 — Customer public profile screen (no worker fields).
class CustomerPublicProfileScreen extends ConsumerWidget {
  final String userId;
  const CustomerPublicProfileScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(customerProfileProvider(userId));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Müşteri Profili'),
        backgroundColor: AppColors.headerBackground(context),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: asyncData.when(
        loading: () => ListSkeleton(itemCount: 4, itemBuilder: (_) => const ProviderCardSkeleton()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (d) => _Body(data: d),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final Map<String, dynamic> data;
  const _Body({required this.data});

  @override
  Widget build(BuildContext context) {
    final name = (data['fullName'] as String?) ?? 'Müşteri';
    final imgUrl = data['profileImageUrl'] as String?;
    final verified = data['identityVerified'] == true;
    final joinedAt = data['joinedAt'] as String?;
    final total = (data['asCustomerTotal'] as num?)?.toInt() ?? 0;
    final success = (data['asCustomerSuccess'] as num?)?.toInt() ?? 0;
    final rate = (data['customerSuccessRate'] as num?)?.toInt() ?? 0;
    final completed = (data['completedJobsCount'] as num?)?.toInt() ?? 0;
    final reviews = (data['reviewsReceivedAsCustomer'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    // 2026-05-26 — canlı DB sayıları; reviews listesi 10 ile sınırlı.
    final totalReviewsCount =
        (data['totalCustomerReviews'] as num?)?.toInt() ?? reviews.length;
    final totalListingsCount =
        (data['totalCustomerListings'] as num?)?.toInt() ?? total;
    final userId = (data['id'] as String?) ?? '';
    // Phase 417 — pencere 1 ay (bu ay). Backend deploy edilene kadar
    // 6 ay listesi gelirse defensive olarak son 1 ay alınır.
    final monthlyRaw = (data['monthlyActivity'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final monthly = monthlyRaw.length > 1
        ? monthlyRaw.sublist(monthlyRaw.length - 1)
        : monthlyRaw;
    final topCats = (data['topCategories'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final avgBudget = (data['avgBudget'] as num?)?.toInt() ?? 0;
    final lastJobs = (data['lastCompletedJobs'] as List?)
            ?.cast<Map<String, dynamic>>() ??
        [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Row(
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: AppColors.primaryLight,
              backgroundImage: (imgUrl != null && imgUrl.isNotEmpty)
                  ? NetworkImage(imgUrl)
                  : null,
              child: (imgUrl == null || imgUrl.isEmpty)
                  ? Text(
                      name.isNotEmpty ? trUpper(name[0]) : '?',
                      style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary),
                    )
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Flexible(
                      child: Text(
                        name,
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (verified) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified_rounded,
                          color: AppColors.primary, size: 20),
                    ],
                  ]),
                  if (joinedAt != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Üyelik: ${_formatDate(joinedAt)}',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Stats card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              _stat('Tamamlanan', '$completed', Icons.check_circle_outline,
                  tooltip: StatTooltips.completedCustomer),
              _divider(),
              _stat('Başarı', '%$rate', Icons.trending_up_rounded,
                  tooltip: StatTooltips.successRate),
              _divider(),
              _stat('Toplam İlan', '$totalListingsCount',
                  Icons.list_alt_rounded,
                  tooltip:
                      'Bu kişinin şimdiye kadar açtığı toplam ilan sayısıdır.'),
              _divider(),
              _stat('Yorum', '$totalReviewsCount',
                  Icons.rate_review_outlined,
                  tooltip: StatTooltips.reviews),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Yorum Yaz ve Değerlendir CTA — 2026-05-26
        if (userId.isNotEmpty)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: BorderSide(color: AppColors.primary.withValues(alpha: 0.6)),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.rate_review_outlined, size: 18),
              label: const Text('Yorum Yaz ve Değerlendir',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: () => _ReviewSheet.show(context, userId, name),
            ),
          ),

        const SizedBox(height: 16),

        // Phase 145 — Aktivite (son 1 ay; Phase 417'de 6→1)
        const Text('Aktivite (Bu Ay)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _activityChart(monthly),

        const SizedBox(height: 20),

        // Top categories
        if (topCats.isNotEmpty) ...[
          const Text('En Sık Çalıştığı Kategoriler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: topCats.map((c) {
              final name = (c['category'] as String?) ?? '';
              final count = (c['count'] as num?)?.toInt() ?? 0;
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('$name ($count)',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
        ],

        // Avg budget
        if (avgBudget > 0) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.payments_rounded,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Text('Ortalama Bütçe: $avgBudget₺',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: AppColors.primary)),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // Last completed jobs
        if (lastJobs.isNotEmpty) ...[
          const Text('Son Tamamlanan İşler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...lastJobs.map((j) => _jobTile(j)),
          const SizedBox(height: 20),
        ],

        const Text('Bu Müşteriye Verilen Yorumlar',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),

        if (reviews.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text('Henüz yorum yok.',
                style: TextStyle(color: AppColors.textSecondary)),
          )
        else
          ...reviews.map((r) => _reviewTile(r)),

        // _ = success suppression (used in success rate calc)
        if (success < 0) const SizedBox.shrink(),
      ],
    );
  }

  Widget _stat(String label, String value, IconData icon,
      {String? tooltip}) {
    // Phase 416 — label yanına opsiyonel bilgi imleci.
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(label,
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis),
              ),
              if (tooltip != null) ...[
                const SizedBox(width: 2),
                StatInfoIcon(
                  title: label,
                  message: tooltip,
                  size: 11,
                  padding: EdgeInsets.zero,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _divider() => Container(
        width: 1,
        height: 36,
        color: Colors.grey.shade200,
      );

  Widget _reviewTile(Map<String, dynamic> r) {
    final rating = (r['rating'] as num?)?.toInt() ?? 0;
    final comment = (r['comment'] as String?) ?? '';
    final reviewerName = (r['reviewerName'] as String?) ?? 'Usta';
    final createdAt = r['createdAt'] as String?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(reviewerName,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                    size: 16,
                    color: AppColors.accent,
                  ),
                ),
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(comment, style: const TextStyle(fontSize: 13)),
          ],
          if (createdAt != null) ...[
            const SizedBox(height: 6),
            Text(_formatDate(createdAt),
                style:
                    TextStyle(fontSize: 11, color: AppColors.textHint)),
          ],
        ],
      ),
    );
  }

  Widget _activityChart(List<Map<String, dynamic>> monthly) {
    if (monthly.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(children: [
          Icon(Icons.show_chart_rounded, color: Colors.grey.shade400),
          const SizedBox(width: 10),
          Expanded(
            child: Text('Henüz aktivite verisi yok.',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
        ]),
      );
    }
    final maxCount = monthly
        .map((m) => (m['count'] as num?)?.toInt() ?? 0)
        .fold<int>(0, (a, b) => a > b ? a : b);
    if (maxCount == 0) {
      // Tüm aylar 0 → boş bar yığını yerine bilgilendirici state.
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(children: [
          Icon(Icons.show_chart_rounded, color: Colors.grey.shade400),
          const SizedBox(width: 10),
          Expanded(
            child: Text('Bu ay tamamlanan iş yok.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ),
        ]),
      );
    }
    final maxBar = maxCount;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: SizedBox(
        height: 100,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: monthly.map((m) {
            final count = (m['count'] as num?)?.toInt() ?? 0;
            final month = (m['month'] as String?) ?? '';
            final mm = month.length >= 7 ? month.substring(5, 7) : '';
            final h = (count / maxBar) * 70;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('$count',
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Container(
                      height: h.clamp(2, 70),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(mm,
                        style: TextStyle(
                            fontSize: 10, color: AppColors.textSecondary)),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _jobTile(Map<String, dynamic> j) {
    final title = (j['title'] as String?) ?? '';
    final cat = (j['category'] as String?) ?? '';
    final budget = (j['budget'] as num?)?.toInt() ?? 0;
    final completedAt = j['completedAt'] as String?;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded,
              color: AppColors.success, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                    '$cat${completedAt != null ? " · ${_formatDate(completedAt)}" : ""}',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          if (budget > 0)
            Text('$budget₺',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontSize: 13)),
        ],
      ),
    );
  }

  static String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
    } catch (_) {
      return iso.substring(0, iso.length.clamp(0, 10));
    }
  }
}

// ── Yorum Yaz ve Değerlendir sheet ─────────────────────────────────────────
class _ReviewSheet extends ConsumerStatefulWidget {
  final String revieweeId;
  final String revieweeName;
  const _ReviewSheet({required this.revieweeId, required this.revieweeName});

  static Future<void> show(
      BuildContext context, String revieweeId, String revieweeName) {
    return showModalBottomSheet(
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ReviewSheet(
        revieweeId: revieweeId,
        revieweeName: revieweeName,
      ),
    );
  }

  @override
  ConsumerState<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends ConsumerState<_ReviewSheet> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating < 1) return;
    setState(() => _saving = true);
    try {
      final dio = ref.read(apiClientProvider).dio;
      await dio.post('/reviews', data: {
        'revieweeId': widget.revieweeId,
        'rating': _rating,
        if (_commentCtrl.text.trim().isNotEmpty)
          'comment': _commentCtrl.text.trim(),
      });
      ref.invalidate(customerProfileProvider(widget.revieweeId));
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        backgroundColor: AppColors.success,
        content: Text('Yorumun yayınlandı, teşekkürler!'),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        20 +
            MediaQuery.of(context).viewInsets.bottom +
            MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade500,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text('${widget.revieweeName} için yorum',
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final v = i + 1;
              return IconButton(
                icon: Icon(
                  v <= _rating
                      ? Icons.star_rounded
                      : Icons.star_border_rounded,
                  color: AppColors.accent,
                  size: 36,
                ),
                onPressed: () => setState(() => _rating = v),
              );
            }),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _commentCtrl,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: 'Yorumun (opsiyonel)',
              filled: true,
              fillColor: AppColors.surfaceElevated,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.black))
                  : const Text('Gönder',
                      style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
