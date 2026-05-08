import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/job_shimmer.dart';
import '../../../../features/categories/data/category_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../widgets/save_job_button.dart';
import '../providers/job_provider.dart';
import 'job_detail_screen.dart';

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class JobListBody extends JobListScreen {
  const JobListBody({super.key}) : super(showAppBar: false);
}

class JobListScreen extends ConsumerStatefulWidget {
  final bool showAppBar;
  const JobListScreen({super.key, this.showAppBar = true});

  @override
  ConsumerState<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends ConsumerState<JobListScreen> {
  bool get _showAppBar => widget.showAppBar;
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
      appBar: _showAppBar
          ? AppBar(
              title: const Text('İş İlanları'),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            )
          : null,
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
          context.push(isLoggedIn ? '/ilan-ver' : '/giris-yap');
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
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.35),
              width: 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 6, offset: const Offset(0, 2))]
                : [],
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : Colors.white,
              fontWeight:
                  isSelected ? FontWeight.bold : FontWeight.w500,
              fontSize: 13,
              letterSpacing: 0.1,
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
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.work_off_rounded,
                size: 48,
                color: AppColors.primary.withValues(alpha: 0.6)),
          ),
          const SizedBox(height: 20),
          const Text('Henüz ilan bulunamadı.',
              style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          const Text('Farklı bir kategori seçmeyi deneyin.',
              style: TextStyle(color: AppColors.textHint, fontSize: 13)),
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
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: job.isFeatured
                  ? const Color(0xFFFFC107)
                  : AppColors.border,
              width: job.isFeatured ? 1.5 : 1),
          boxShadow: job.isFeatured
              ? [
                  BoxShadow(
                      color: const Color(0xFFFFC107).withValues(alpha: 0.18),
                      blurRadius: 14,
                      offset: const Offset(0, 4)),
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 4,
                      offset: const Offset(0, 1)),
                ]
              : [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 3)),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (job.isFeatured)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.amber.shade400, Colors.amber.shade600],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.workspace_premium_rounded,
                        color: Colors.white, size: 13),
                    SizedBox(width: 4),
                    Text('Öne Çıkan',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.3)),
                  ],
                ),
              ),
            Row(
              children: [
                Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                      color: job.color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14)),
                  child: Icon(job.icon, color: job.color, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(job.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded,
                              size: 12, color: AppColors.textHint),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(job.location,
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textHint),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(job.budget,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: AppColors.primary)),
                ),
                SaveJobButton(jobId: job.id),
              ],
            ),
            const SizedBox(height: 12),
            Text(job.desc,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.45)),
            if (job.photos != null && job.photos!.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: job.photos!.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) => ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: CachedNetworkImage(
                      imageUrl: job.photos![i],
                      width: 90,
                      height: 72,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                          width: 90, color: AppColors.primaryLight),
                      errorWidget: (_, __, ___) => Container(
                          width: 90,
                          color: AppColors.primaryLight,
                          child: const Icon(Icons.broken_image_outlined,
                              color: AppColors.textHint, size: 20)),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
