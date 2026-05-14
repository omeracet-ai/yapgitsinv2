import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../ai/data/recommendation_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

/// Shows AI-powered recommendations in HomeTab.
/// - Worker user → recommended open jobs
/// - Customer user → (reserved for future worker suggestions per-job)
class AiRecommendationsSection extends ConsumerWidget {
  const AiRecommendationsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();

    final userId = authState.user['id'] as String? ?? '';
    final jobsAsync = ref.watch(recommendedJobsProvider(userId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Senin İçin Öneriler'),
        const SizedBox(height: 10),
        jobsAsync.when(
          data: (jobs) {
            if (jobs.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Henüz öneri yok. Profilini tamamla!',
                  style: TextStyle(color: AppColors.textHint, fontSize: 13),
                ),
              );
            }
            return SizedBox(
              height: 112,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: jobs.length,
                itemBuilder: (_, i) => _RecommendedJobCard(
                  job: jobs[i],
                  onTap: () => context.push('/ilan/${jobs[i]['id']}'),
                ),
              ),
            );
          },
          loading: () => SizedBox(
            height: 112,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 3,
              itemBuilder: (_, __) => const _SkeletonCard(),
            ),
          ),
          error: (_, __) => const SizedBox.shrink(),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _RecommendedJobCard extends StatelessWidget {
  final Map<String, dynamic> job;
  final VoidCallback onTap;
  const _RecommendedJobCard({required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final budgetMin = job['budgetMinMinor'] as int?;
    final budgetStr = budgetMin != null
        ? '${(budgetMin / 100).toStringAsFixed(0)} TL~'
        : 'Fiyat yok';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.work_outline_rounded,
                      size: 16, color: AppColors.primary),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    job['category'] as String? ?? '',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textHint),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              job['title'] as String? ?? '',
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: AppColors.textPrimary),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  budgetStr,
                  style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    const Icon(Icons.location_on_rounded,
                        size: 11, color: AppColors.textHint),
                    const SizedBox(width: 2),
                    SizedBox(
                      width: 60,
                      child: Text(
                        job['location'] as String? ?? '',
                        style: const TextStyle(
                            fontSize: 10, color: AppColors.textHint),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(height: 28, width: 28, color: Colors.grey.shade200),
          Container(height: 12, color: Colors.grey.shade200),
          Container(height: 12, width: 120, color: Colors.grey.shade200),
          Container(height: 12, width: 80, color: Colors.grey.shade200),
        ],
      ),
    );
  }
}
