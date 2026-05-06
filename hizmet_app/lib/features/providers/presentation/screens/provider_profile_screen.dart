import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../reviews/presentation/screens/write_review_screen.dart';
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
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text('Yüklenemedi: $e',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary)),
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
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
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
                            decoration: const BoxDecoration(
                                color: Colors.white, shape: BoxShape.circle),
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
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statCol(rating.toStringAsFixed(1), 'Puan', Icons.star, Colors.amber),
          _statCol(totalReviews.toString(), 'Yorum', Icons.reviews_outlined, Colors.green),
          _statCol(isVerified ? 'Onaylı' : 'Bekliyor', 'Durum',
              isVerified ? Icons.verified : Icons.pending_outlined,
              isVerified ? Colors.blue : Colors.orange),
        ],
      ),
    );
  }

  Widget _statCol(String value, String label, IconData icon, Color color) {
    return Column(children: [
      Icon(icon, color: color, size: 24),
      const SizedBox(height: 6),
      Text(value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      Text(label,
          style: const TextStyle(color: AppColors.textHint, fontSize: 12)),
    ]);
  }

  Widget _buildBio(String bio) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hakkında',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Text(bio,
              style: const TextStyle(
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
          decoration: BoxDecoration(
              color: Colors.white,
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
                  style: const TextStyle(
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
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Belgeler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: badges),
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
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Yorumlar',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              TextButton.icon(
                onPressed: () => _openWriteReview(context, ref, provider),
                icon: const Icon(Icons.rate_review_outlined,
                    size: 16, color: AppColors.primary),
                label: const Text('Yorum Yaz',
                    style: TextStyle(color: AppColors.primary, fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          reviewsAsync.when(
            loading: () =>
                const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Yorumlar yüklenemedi.',
                style: TextStyle(color: AppColors.textHint)),
            data: (reviews) => reviews.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
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
    final rating  = (review['rating'] ?? 0) as int;
    final comment = review['comment'] as String? ?? '';

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
              Text(reviewerName,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Row(
                children: List.generate(
                    5,
                    (i) => Icon(Icons.star,
                        size: 14,
                        color: i < rating ? Colors.amber : Colors.grey[300])),
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(comment,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 13)),
          ],
        ],
      ),
    );
  }

  void _openWriteReview(BuildContext context, WidgetRef ref,
      Map<String, dynamic> provider) {
    final auth = ref.read(authStateProvider);
    if (auth is! AuthAuthenticated) {
      context.push('/giris-yap');
      return;
    }
    final userId = provider['userId'] as String? ?? '';
    showModalBottomSheet(
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

