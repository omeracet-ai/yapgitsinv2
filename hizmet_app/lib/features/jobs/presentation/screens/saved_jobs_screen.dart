import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../data/saved_jobs_provider.dart';
import 'job_detail_screen.dart';

class SavedJobsScreen extends ConsumerWidget {
  const SavedJobsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savedAsync = ref.watch(mySavedJobsListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kaydedilen İşler'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: savedAsync.when(
        loading: () => ListSkeleton(
          itemCount: 5,
          itemBuilder: (_) => const JobCardSkeleton(),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(e.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textHint)),
          ),
        ),
        data: (jobs) {
          if (jobs.isEmpty) return const _EmptyState();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(mySavedJobsListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: jobs.length,
              itemBuilder: (_, i) => _SavedJobCard(job: jobs[i]),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      icon: Icons.bookmark_border_rounded,
      title: 'Kaydedilen iş yok',
      message:
          'Sonra dönmek istediğin ilanları yer imine ekle, hepsi burada toplansın.',
    );
  }
}

class _SavedJobCard extends ConsumerWidget {
  final Map<String, dynamic> job;
  const _SavedJobCard({required this.job});

  String _budget(BuildContext context) {
    // P190/4 — IntlFormatter.currency.
    final mn = job['budgetMin'];
    final mx = job['budgetMax'];
    if (mn == null && mx == null) return 'Pazarlık';
    if (mn != null && mx != null) {
      return '${IntlFormatter.currency(context, (mn as num), decimalDigits: 0)} - ${IntlFormatter.currency(context, (mx as num), decimalDigits: 0)}';
    }
    return IntlFormatter.currency(context, ((mn ?? mx) as num), decimalDigits: 0);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = job['id']?.toString() ?? '';
    final title = (job['title'] ?? '').toString();
    final desc = (job['description'] ?? '').toString();
    final category = (job['category'] ?? '').toString();
    final location = (job['location'] ?? '').toString();
    final status = (job['status'] ?? 'open').toString();
    final photos =
        (job['photos'] as List?)?.map((e) => e.toString()).toList() ?? [];

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => JobDetailScreen(
          id: id,
          title: title,
          description: desc,
          location: location,
          budget: _budget(context),
          category: category,
          postedAt: '',
          icon: Icons.work_outline_rounded,
          color: AppColors.primary,
          isFeatured: false,
          customerId: job['customerId']?.toString() ?? '',
        ),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(14),
                image: photos.isNotEmpty
                    ? DecorationImage(
                        image: NetworkImage(photos.first), fit: BoxFit.cover)
                    : null,
              ),
              child: photos.isEmpty
                  ? const Icon(Icons.work_outline_rounded,
                      color: AppColors.primary)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 3),
                  if (category.isNotEmpty)
                    Text(category,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded,
                          size: 12, color: AppColors.textHint),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textHint)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_budget(context),
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary)),
                      ),
                      const SizedBox(width: 6),
                      if (status != 'open')
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.textHint.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(status,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textHint,
                                  fontWeight: FontWeight.w600)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.bookmark, color: AppColors.primary),
              tooltip: 'Kaydedilenlerden çıkar',
              onPressed: () async {
                try {
                  await ref.read(savedJobsProvider.notifier).toggle(id);
                  ref.invalidate(mySavedJobsListProvider);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
