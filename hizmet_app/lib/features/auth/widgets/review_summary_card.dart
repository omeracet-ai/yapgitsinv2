import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../ai/data/ai_repository.dart';

/// AI özeti — backend POST /ai/summarize-reviews { reviews } → { summary }
final reviewSummaryProvider = FutureProvider.autoDispose
    .family<String, _SummaryArgs>((ref, args) async {
  if (args.reviews.length < 3) return '';
  final repo = ref.watch(aiRepositoryProvider);
  return repo.summarizeReviews(args.reviews);
});

class _SummaryArgs {
  final String userId;
  final List<String> reviews;
  const _SummaryArgs(this.userId, this.reviews);

  @override
  bool operator ==(Object o) =>
      o is _SummaryArgs && o.userId == userId && o.reviews.length == reviews.length;

  @override
  int get hashCode => Object.hash(userId, reviews.length);
}

class ReviewSummaryCard extends ConsumerWidget {
  final String userId;
  final List<String> reviewComments;
  const ReviewSummaryCard({
    super.key,
    required this.userId,
    required this.reviewComments,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (reviewComments.length < 3) return const SizedBox.shrink();
    final async = ref.watch(reviewSummaryProvider(_SummaryArgs(userId, reviewComments)));

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.circular(12),
          border: const Border(
            left: BorderSide(color: AppColors.primary, width: 3),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('✨', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                const Text('AI Yorum Özeti',
                    style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('AI',
                      style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 0.5)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            async.when(
              loading: () => const _ShimmerLines(),
              error: (e, _) => Text(
                'Özet şu an oluşturulamadı.',
                style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                    fontStyle: FontStyle.italic),
              ),
              data: (text) {
                if (text.trim().isEmpty) {
                  return const SizedBox.shrink();
                }
                return Text(
                  text,
                  style: const TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: AppColors.textPrimary),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ShimmerLines extends StatelessWidget {
  const _ShimmerLines();
  @override
  Widget build(BuildContext context) {
    Widget bar(double w) => Container(
          width: w,
          height: 10,
          margin: const EdgeInsets.only(bottom: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(4),
          ),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [bar(double.infinity), bar(220), bar(160)],
    );
  }
}
