import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/job_shimmer.dart';
import '../../../../features/categories/data/category_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/job_provider.dart';
import 'job_detail_screen.dart';

class JobListScreen extends ConsumerStatefulWidget {
  const JobListScreen({super.key});

  @override
  ConsumerState<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends ConsumerState<JobListScreen> {
  String? _activeCategory; // null = Tümü

  void _selectCategory(String? category) {
    setState(() => _activeCategory = category);
    ref.read(jobsProvider.notifier).fetchJobs(category: category);
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('İş İlanları'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildSearchAndFilter(categoriesAsync),
          Expanded(
            child: jobsAsync.when(
              data: (jobs) => jobs.isEmpty
                  ? _buildEmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: jobs.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _JobCard(job: jobs[index]),
                    ),
              loading: () => ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: 6,
                itemBuilder: (_, __) => const JobShimmer(),
              ),
              error: (err, _) => Center(child: Text('Hata: $err')),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final isLoggedIn = ref.read(authStateProvider) is AuthAuthenticated;
          context.push(isLoggedIn ? '/post-job' : '/login');
        },
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('İlan Ver'),
      ),
    );
  }

  Widget _buildSearchAndFilter(
      AsyncValue<List<Map<String, dynamic>>> categoriesAsync) {
    return Container(
      color: AppColors.primary,
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12)),
            child: TextField(
              onChanged: (v) =>
                  ref.read(jobsProvider.notifier).filterJobs(v),
              decoration: const InputDecoration(
                hintText: 'İş ara...',
                prefixIcon:
                    Icon(Icons.search, color: AppColors.textHint),
                border: InputBorder.none,
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 36,
            child: categoriesAsync.when(
              data: (cats) => ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildChip(null, 'Tümü'),
                  ...cats.map((c) => _buildChip(
                        c['name'] as String?,
                        '${c['icon'] ?? ''} ${c['name'] ?? ''}'.trim(),
                      )),
                ],
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildChip(null, 'Tümü'),
                  _buildChip('Temizlik', 'Temizlik'),
                  _buildChip('Tesisat', 'Tesisat'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String? category, String label) {
    final isSelected = _activeCategory == category;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => _selectCategory(category),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.white24,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : Colors.white,
              fontWeight:
                  isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off,
              size: 64,
              color: AppColors.textHint.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          const Text('Henüz ilan bulunamadı.',
              style: TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final Job job;
  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => JobDetailScreen(
            id: job.id,
            title: job.title,
            description: job.desc,
            location: job.location,
            budget: job.budget,
            category: job.category,
            postedAt: job.time,
            icon: job.icon,
            color: job.color,
            isFeatured: job.isFeatured,
            customerId: job.customerId,
          ),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: job.isFeatured
                  ? Colors.amber.shade400
                  : AppColors.border,
              width: job.isFeatured ? 2 : 1),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (job.isFeatured)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.star,
                        color: Colors.amber.shade700, size: 12),
                    const SizedBox(width: 4),
                    Text('Öne Çıkan',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.amber.shade800,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            Row(
              children: [
                Container(
                  height: 48,
                  width: 48,
                  decoration: BoxDecoration(
                      color: job.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12)),
                  child: Icon(job.icon, color: job.color, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(job.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(job.location,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textHint)),
                    ],
                  ),
                ),
                Text(job.budget,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 12),
            Text(job.desc,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
