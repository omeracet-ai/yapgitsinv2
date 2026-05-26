import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/notification_bell.dart';
import '../../../../features/categories/data/category_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/job_filter.dart';
import '../../widgets/job_filter_sheet.dart';
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
  String _searchQuery = '';
  String _searchText = ''; // anlık raw input (suggestion için)
  Timer? _debounce;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _selectCategory(String? category) {
    setState(() => _activeCategory = category);
    ref.read(jobsProvider.notifier).fetchJobs(
          category: category,
          q: _searchQuery.isEmpty ? null : _searchQuery,
        );
  }

  void _onSearchChanged(String value) {
    setState(() => _searchText = value);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _searchQuery = value.trim();
      ref.read(jobsProvider.notifier).setQuery(_searchQuery);
    });
  }

  Future<void> _openFilterSheet() async {
    final current = ref.read(jobFilterProvider);
    final result = await showModalBottomSheet<JobFilter>(
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => JobFilterSheet(initial: current),
    );
    if (result != null) {
      ref.read(jobFilterProvider.notifier).state = result;
    }
  }

  void _applySuggestion(String categoryName) {
    _searchController.text = categoryName;
    setState(() {
      _searchText = '';
      _activeCategory = categoryName;
    });
    _debounce?.cancel();
    ref.read(jobsProvider.notifier).fetchJobs(category: categoryName);
    FocusScope.of(context).unfocus();
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
              backgroundColor: AppColors.background,
              foregroundColor: AppColors.textPrimary,
              actions: const [
                NotificationBell(),
                SizedBox(width: 4),
              ],
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
              loading: () => ListSkeleton(
                itemCount: 6,
                itemBuilder: (_) => const JobCardSkeleton(),
              ),
              error: (err, _) => Center(child: Text('Hata: $err')),
            ),
          ),
        ],
      ),
      // "+ İlan Ver" FAB kaldırıldı.
    );
  }

  Widget _buildSearchAndFilter(
      AsyncValue<List<Map<String, dynamic>>> categoriesAsync) {
    return Container(
      color: AppColors.primary,
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12)),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'İş ara...',
                      prefixIcon:
                          Icon(Icons.search, color: AppColors.textHint),
                      border: InputBorder.none,
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildFilterButton(),
            ],
          ),
          // Suggestion dropdown — kategori match listesi
          if (_searchText.trim().isNotEmpty)
            categoriesAsync.maybeWhen(
              data: (cats) {
                final lower = _searchText.trim().toLowerCase();
                final matches = cats.where((c) {
                  final name = ((c['name'] as String?) ?? '').toLowerCase();
                  if (name.isEmpty) return false;
                  return name.contains(lower) || lower.contains(name);
                }).take(6).toList();
                if (matches.isEmpty) return const SizedBox.shrink();
                return Container(
                  margin: const EdgeInsets.only(top: 6),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: matches.map((c) {
                      final name = (c['name'] as String?) ?? '';
                      final emoji = (c['icon'] as String?) ?? '';
                      return InkWell(
                        onTap: () => _applySuggestion(name),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              Text(emoji, style: const TextStyle(fontSize: 16)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  name,
                                  style: TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500),
                                ),
                              ),
                              Icon(Icons.north_west,
                                  size: 16, color: AppColors.textHint),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                );
              },
              orElse: () => const SizedBox.shrink(),
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

  Widget _buildFilterButton() {
    final activeCount = ref.watch(jobFilterProvider).activeCount;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _openFilterSheet,
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: const Icon(Icons.tune_rounded,
                  color: AppColors.primary, size: 22),
            ),
          ),
        ),
        if (activeCount > 0)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              constraints:
                  const BoxConstraints(minWidth: 18, minHeight: 18),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.primary, width: 1.5),
              ),
              child: Text(
                '$activeCount',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ),
      ],
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
    final hasSearch = _searchQuery.isNotEmpty;
    if (hasSearch) {
      return const EmptyState(
        icon: Icons.search_off_rounded,
        title: 'Sonuç bulunamadı',
        message: 'Başka bir kelime ya da kategori deneyin.',
      );
    }
    return const EmptyState(
      icon: Icons.work_off_rounded,
      title: 'Henüz ilan yok',
      message: 'Yeni ilanlar yayınlandığında burada görünecek.',
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
        decoration: BoxDecoration(color: AppColors.surface,
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
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.location_on_rounded,
                              size: 12, color: AppColors.textHint),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(job.location,
                                style: TextStyle(
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
                style: TextStyle(
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
                          child: Icon(Icons.broken_image_outlined,
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
