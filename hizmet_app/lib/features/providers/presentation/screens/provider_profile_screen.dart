import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/overflow_slide_row.dart';
import '../../../../core/widgets/stat_info_popup.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../reviews/presentation/screens/write_review_screen.dart';
import '../../../reviews/data/review_repository.dart';
import '../../../photos/presentation/widgets/job_photo_picker.dart';
import '../../data/provider_repository.dart';

class ProviderProfileScreen extends ConsumerWidget {
  final String providerId;
  const ProviderProfileScreen({super.key, required this.providerId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providerAsync = ref.watch(providerDetailProvider(providerId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: providerAsync.when(
        loading: () => ListSkeleton(itemCount: 4, itemBuilder: (_) => const ProviderCardSkeleton()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text('Yüklenemedi: $e',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(providerDetailProvider(providerId)),
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
        data: (provider) => _ProviderContent(provider: provider),
      ),
    );
  }
}

class _ProviderContent extends ConsumerWidget {
  final Map<String, dynamic> provider;
  const _ProviderContent({required this.provider});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user         = provider['user'] as Map<String, dynamic>?;
    final name         = user?['fullName'] as String? ?? 'Sağlayıcı';
    final businessName = provider['businessName'] as String? ?? '';
    final bio          = provider['bio'] as String? ?? '';
    final rating       = (provider['averageRating'] ?? 0.0) as num;
    final totalReviews = (provider['totalReviews'] ?? 0) as int;
    final isVerified   = provider['isVerified'] == true;
    final userId       = provider['userId'] as String? ?? '';

    final reviewsAsync = ref.watch(providerReviewsProvider(userId));
    final completedJobsAsync =
        ref.watch(providerCompletedJobsProvider(provider['id'] as String));

    return CustomScrollView(
      slivers: [
        _buildAppBar(context, name, businessName, isVerified),
        SliverToBoxAdapter(
          child: Column(
            children: [
              _buildStats(rating.toDouble(), totalReviews, isVerified),
              _buildRatingBreakdown(reviewsAsync, rating.toDouble(), totalReviews),
              if (bio.isNotEmpty) _buildBio(bio),
              _buildDocumentBadges(provider),
              _buildCompletedJobsSection(completedJobsAsync),
              _buildReviewsSection(context, ref, reviewsAsync, provider),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAppBar(BuildContext context, String name, String businessName, bool isVerified) {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      // Gradient zemin koruyor; collapse durumunda tema-duyarlı header rengi gözükür.
      backgroundColor: AppColors.headerSurface,
      foregroundColor: AppColors.headerForeground,
      iconTheme: IconThemeData(color: AppColors.headerForeground),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
              ),
            ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 40),
                  Stack(
                    children: [
                      const CircleAvatar(
                        radius: 42,
                        backgroundColor: Colors.white24,
                        child: Icon(Icons.person, size: 52, color: Colors.white),
                      ),
                      if (isVerified)
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(color: AppColors.surface, shape: BoxShape.circle),
                            child: const Icon(Icons.verified,
                                color: Colors.blue, size: 20),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(name,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold)),
                      if (isVerified) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.verified, color: Colors.blue, size: 18),
                      ],
                    ],
                  ),
                  if (businessName.isNotEmpty)
                    Text(businessName,
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 14)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStats(double rating, int totalReviews, bool isVerified) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statCol(rating.toStringAsFixed(1), 'Puan', Icons.star, Colors.amber,
              tooltip: StatTooltips.rating),
          _statCol(totalReviews.toString(), 'Yorum',
              Icons.reviews_outlined, Colors.green,
              tooltip: StatTooltips.reviews),
          _statCol(isVerified ? 'Onaylı' : 'Bekliyor', 'Durum',
              isVerified ? Icons.verified : Icons.pending_outlined,
              isVerified ? Colors.blue : Colors.orange,
              tooltip: isVerified
                  ? 'Bu hizmet verenin kimliği yönetici tarafından doğrulanmıştır.'
                  : 'Bu hizmet verenin kimlik doğrulaması henüz tamamlanmamıştır.'),
        ],
      ),
    );
  }

  Widget _buildRatingBreakdown(
      AsyncValue<List<Map<String, dynamic>>> reviewsAsync,
      double rating,
      int totalReviews) {
    return reviewsAsync.maybeWhen(
      data: (reviews) {
        if (reviews.isEmpty) return const SizedBox.shrink();
        final counts = <int, int>{1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        for (final r in reviews) {
          final s = (r['rating'] ?? r['stars'] ?? 0) as num;
          final star = s.round().clamp(1, 5);
          counts[star] = (counts[star] ?? 0) + 1;
        }
        final total = reviews.length;
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    rating.toStringAsFixed(1),
                    style: const TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: List.generate(5, (i) {
                        final filled = i < rating.round();
                        return Icon(
                          filled ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 18,
                        );
                      })),
                      Text('$totalReviews değerlendirme',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.textHint)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...[5, 4, 3, 2, 1].map((star) {
                final c = counts[star] ?? 0;
                final pct = total == 0 ? 0.0 : c / total;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 18,
                        child: Text('$star',
                            style: const TextStyle(fontSize: 12)),
                      ),
                      const Icon(Icons.star,
                          size: 14, color: Colors.amber),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            minHeight: 8,
                            backgroundColor: AppColors.border,
                            valueColor: const AlwaysStoppedAnimation(
                                Colors.amber),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 32,
                        child: Text('$c',
                            textAlign: TextAlign.right,
                            style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary)),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  Widget _statCol(String value, String label, IconData icon, Color color,
      {String? tooltip}) {
    // Phase 416 — label yanına opsiyonel bilgi imleci.
    return Column(children: [
      Icon(icon, color: color, size: 24),
      const SizedBox(height: 6),
      Text(value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label,
              style: TextStyle(color: AppColors.textHint, fontSize: 12)),
          if (tooltip != null) ...[
            const SizedBox(width: 2),
            StatInfoIcon(
              title: label,
              message: tooltip,
              size: 12,
              padding: EdgeInsets.zero,
            ),
          ],
        ],
      ),
    ]);
  }

  Widget _buildBio(String bio) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hakkında',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Text(bio,
              style: TextStyle(
                  color: AppColors.textSecondary, height: 1.6)),
        ],
      ),
    );
  }

  Widget _buildCompletedJobsSection(
      AsyncValue<List<Map<String, dynamic>>> jobsAsync) {
    return jobsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (jobs) {
        if (jobs.isEmpty) return const SizedBox.shrink();
        return Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Son Tamamlanan İşler',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ...jobs.map((job) => _completedJobCard(job)),
            ],
          ),
        );
      },
    );
  }

  Widget _completedJobCard(Map<String, dynamic> job) {
    final title = job['title'] as String? ?? '';
    final category = job['category'] as String? ?? '';
    final photos =
        (job['photos'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            [];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.check_circle, color: Colors.teal, size: 16),
            const SizedBox(width: 6),
            Expanded(
              child: Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14)),
            ),
          ]),
          if (category.isNotEmpty) ...[
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 22),
              child: Text(category,
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 12)),
            ),
          ],
          if (photos.isNotEmpty) ...[
            const SizedBox(height: 8),
            PhotoGalleryView(photoUrls: photos, height: 90),
          ],
          const Divider(height: 20),
        ],
      ),
    );
  }

  Widget _buildDocumentBadges(Map<String, dynamic> provider) {
    final docs = provider['documents'] as Map<String, dynamic>?;
    if (docs == null || docs.isEmpty) return const SizedBox.shrink();

    final badges = <Widget>[];
    if (docs['certificateUrl'] != null) {
      badges.add(_badge(Icons.workspace_premium, 'Yeterlilik Belgesi', Colors.orange));
    }
    if (docs['identityUrl'] != null) {
      badges.add(_badge(Icons.credit_card, 'Kimlik Belgesi', Colors.blue));
    }
    if (docs['tradeRegistryUrl'] != null) {
      badges.add(_badge(Icons.business, 'Ticaret Sicil', Colors.teal));
    }

    if (badges.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Belgeler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          // Phase 429 — Wrap → OverflowSlideRow (belge sayısı arttıkça
          // multi-line yerine yatay slide + <> oklar).
          OverflowSlideRow(spacing: 8, height: 32, children: badges),
        ],
      ),
    );
  }

  Widget _badge(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 12, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildReviewsSection(
      BuildContext context,
      WidgetRef ref,
      AsyncValue<List<Map<String, dynamic>>> reviewsAsync,
      Map<String, dynamic> provider) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Phase 452 (hatalar.txt #1) — Review gating.
          // Provider profile sayfasındaki "Yorum Yaz" butonu kaldırıldı.
          // Yorum yazma artık sadece job tamamlandı/red edildi sonrası
          // (JobDetail veya PendingReviewsPopup) akışından açılır.
          const Text('Yorumlar',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          reviewsAsync.when(
            loading: () =>
                const Center(child: CircularProgressIndicator()),
            error: (_, __) => Text('Yorumlar yüklenemedi.',
                style: TextStyle(color: AppColors.textHint)),
            data: (reviews) => reviews.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text('Henüz yorum yok.',
                        style: TextStyle(color: AppColors.textHint)),
                  )
                : Column(
                    children: reviews
                        .map((r) => _reviewCard(r))
                        .toList()),
          ),
        ],
      ),
    );
  }

  Widget _reviewCard(Map<String, dynamic> review) {
    final reviewer = review['reviewer'] as Map<String, dynamic>?;
    final reviewerName = reviewer?['fullName'] as String? ?? 'Kullanıcı';
    final rating = (review['rating'] ?? 0) as int;
    final comment = review['comment'] as String? ?? '';
    final photos = (review['photos'] as List?)?.cast<String>() ?? [];
    final helpfulCount = (review['helpfulCount'] ?? 0) as int;
    final reviewId = review['id'] as String;

    return _ReviewCardWidget(
      reviewId: reviewId,
      reviewerName: reviewerName,
      rating: rating,
      comment: comment,
      photos: photos,
      helpfulCount: helpfulCount,
    );
  }

  // Phase 452 (hatalar.txt #1) — Yorum yazma artık job completed/rejected
  // sonrası açılır; entry korunuyor (gelecekte gerekirse tekrar bağlanabilir).
  // ignore: unused_element
  void _openWriteReview(BuildContext context, WidgetRef ref,
      Map<String, dynamic> provider) {
    final auth = ref.read(authStateProvider);
    if (auth is! AuthAuthenticated) {
      context.push('/giris-yap');
      return;
    }
    final userId = provider['userId'] as String? ?? '';
    showModalBottomSheet(
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => WriteReviewSheet(
        revieweeId: userId,
        revieweeName: provider['businessName'] as String? ?? 'Sağlayıcı',
        onSubmitted: () => ref.invalidate(providerReviewsProvider(userId)),
      ),
    );
  }
}

/// Phase 212: Review kartı — fotoğraf scroll + faydalı butonu
class _ReviewCardWidget extends ConsumerStatefulWidget {
  final String reviewId;
  final String reviewerName;
  final int rating;
  final String comment;
  final List<String> photos;
  final int helpfulCount;

  const _ReviewCardWidget({
    required this.reviewId,
    required this.reviewerName,
    required this.rating,
    required this.comment,
    required this.photos,
    required this.helpfulCount,
  });

  @override
  ConsumerState<_ReviewCardWidget> createState() => _ReviewCardWidgetState();
}

class _ReviewCardWidgetState extends ConsumerState<_ReviewCardWidget> {
  late int _helpfulCount;
  bool _voted = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _helpfulCount = widget.helpfulCount;
  }

  Future<void> _onHelpful() async {
    if (_voted || _loading) return;
    setState(() => _loading = true);
    try {
      final repo = ref.read(reviewRepositoryProvider);
      final count = await repo.markHelpful(widget.reviewId);
      setState(() {
        _helpfulCount = count;
        _voted = true;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', '')), duration: const Duration(seconds: 2)),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(widget.reviewerName,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Row(
                children: List.generate(
                    5,
                    (i) => Icon(Icons.star,
                        size: 14,
                        color: i < widget.rating ? Colors.amber : Colors.grey[300])),
              ),
            ],
          ),
          if (widget.comment.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(widget.comment,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ],
          // Phase 212: fotoğraf thumbnails
          if (widget.photos.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 80,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: widget.photos.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (_, i) => ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    widget.photos[i],
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 80,
                      height: 80,
                      color: AppColors.border,
                      child: Icon(Icons.broken_image, color: AppColors.textHint),
                    ),
                  ),
                ),
              ),
            ),
          ],
          // Phase 212: faydalı butonu
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _onHelpful,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _loading
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : Icon(
                        _voted ? Icons.thumb_up : Icons.thumb_up_outlined,
                        size: 16,
                        color: _voted ? AppColors.primary : AppColors.textHint,
                      ),
                const SizedBox(width: 4),
                Text(
                  'Faydalı ($_helpfulCount)',
                  style: TextStyle(
                    fontSize: 12,
                    color: _voted ? AppColors.primary : AppColors.textHint,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
