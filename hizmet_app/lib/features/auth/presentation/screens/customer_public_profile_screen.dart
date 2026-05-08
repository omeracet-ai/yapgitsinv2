import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/customer_profile_repository.dart';

/// Phase 133 — Customer public profile screen (no worker fields).
class CustomerPublicProfileScreen extends ConsumerWidget {
  final String userId;
  const CustomerPublicProfileScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(customerProfileProvider(userId));
    return Scaffold(
      appBar: AppBar(title: const Text('Müşteri Profili')),
      body: asyncData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
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
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
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
                        style: const TextStyle(
                            fontSize: 12, color: Colors.black54),
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
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              _stat('Tamamlanan', '$completed', Icons.check_circle_outline),
              _divider(),
              _stat('Başarı', '%$rate', Icons.trending_up_rounded),
              _divider(),
              _stat('Toplam İlan', '$total', Icons.list_alt_rounded),
              _divider(),
              _stat('Yorum', '${reviews.length}', Icons.rate_review_outlined),
            ],
          ),
        ),

        const SizedBox(height: 24),
        const Text('Bu Müşteriye Verilen Yorumlar',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),

        if (reviews.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('Henüz yorum yok.',
                style: TextStyle(color: Colors.black54)),
          )
        else
          ...reviews.map((r) => _reviewTile(r)),

        // _ = success suppression (used in success rate calc)
        if (success < 0) const SizedBox.shrink(),
      ],
    );
  }

  Widget _stat(String label, String value, IconData icon) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(fontSize: 11, color: Colors.black54),
              textAlign: TextAlign.center),
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
      decoration: BoxDecoration(
        color: Colors.white,
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
                    const TextStyle(fontSize: 11, color: Colors.black45)),
          ],
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
