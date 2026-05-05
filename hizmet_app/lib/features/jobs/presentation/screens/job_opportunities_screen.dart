import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/offer_repository.dart';
import '../providers/job_provider.dart';
import 'job_detail_screen.dart';

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class JobOpportunitiesBody extends JobOpportunitiesScreen {
  const JobOpportunitiesBody({super.key}) : super(showAppBar: false);
}

/// Usta için açık ilanlar (bid verebileceği işler)
class JobOpportunitiesScreen extends ConsumerStatefulWidget {
  final bool showAppBar;
  const JobOpportunitiesScreen({super.key, this.showAppBar = true});

  @override
  ConsumerState<JobOpportunitiesScreen> createState() => _JobOpportunitiesScreenState();
}

class _JobOpportunitiesScreenState extends ConsumerState<JobOpportunitiesScreen> {
  bool get _showAppBar => widget.showAppBar;
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final jobsAsync = ref.watch(jobsProvider);

    // Ustanın kendi kategori listesi
    final myCategories = authState is AuthAuthenticated
        ? (authState.user['workerCategories'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ?? []
        : <String>[];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _showAppBar
          ? AppBar(
              title: const Text('İş Fırsatları'),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.read(jobsProvider.notifier).fetchJobs(),
                ),
              ],
            )
          : null,
      body: Column(
        children: [
          // ── Kategori filtresi ────────────────────────────────────────────
          if (myCategories.isNotEmpty)
            Container(
              color: AppColors.primary,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text('Uzmanlık Alanlarım',
                        style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'Tümü',
                          isActive: _selectedCategory == null,
                          onTap: () => setState(() => _selectedCategory = null),
                        ),
                        const SizedBox(width: 8),
                        ...myCategories.map((cat) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: _FilterChip(
                            label: cat,
                            isActive: _selectedCategory == cat,
                            onTap: () => setState(() =>
                                _selectedCategory = _selectedCategory == cat ? null : cat),
                          ),
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // ── İlan listesi ─────────────────────────────────────────────────
          Expanded(
            child: jobsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.textHint),
                    const SizedBox(height: 12),
                    Text('$e', style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.read(jobsProvider.notifier).fetchJobs(),
                      child: const Text('Yenile'),
                    ),
                  ],
                ),
              ),
              data: (jobs) {
                final myUserId = authState is AuthAuthenticated
                    ? authState.user['id'] as String? : null;

                // Sadece açık ilanlar, kendi ilanlarım hariç
                var filtered = jobs
                    .where((j) => j.status == JobStatus.OPEN)
                    .where((j) => j.customerId != myUserId)
                    .toList();

                // Kategori filtresi
                if (_selectedCategory != null) {
                  filtered = filtered
                      .where((j) => j.category == _selectedCategory)
                      .toList();
                } else if (myCategories.isNotEmpty) {
                  // Varsayılan: sadece uzmanlık kategorileri
                  filtered = filtered
                      .where((j) => myCategories.contains(j.category))
                      .toList();
                }

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.work_off_outlined, size: 64,
                            color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        const Text('Bu kategoride açık ilan yok.',
                            style: TextStyle(color: AppColors.textHint, fontSize: 15)),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => setState(() => _selectedCategory = null),
                          child: const Text('Tüm Kategorilere Bak'),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(jobsProvider.notifier).fetchJobs(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => _OpportunityCard(job: filtered[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Filtre chip ───────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.white24,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isActive ? AppColors.primary : Colors.white,
          ),
        ),
      ),
    );
  }
}

// ─── İlan kartı ───────────────────────────────────────────────────────────────

class _OpportunityCard extends ConsumerWidget {
  final Job job;
  const _OpportunityCard({required this.job});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersAsync = ref.watch(jobOffersProvider(job.id));
    final offerCount  = offersAsync.maybeWhen(data: (o) => o.length, orElse: () => 0);

    final budgetStr = (job.budgetMin != null && job.budgetMax != null)
        ? '${job.budgetMin!.toInt()} – ${job.budgetMax!.toInt()} ₺'
        : job.budgetMin != null ? '${job.budgetMin!.toInt()} ₺~' : 'Belirtilmemiş';

    final postedAgo = job.createdAt != null
        ? _timeAgo(job.createdAt!)
        : '';

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => JobDetailScreen(
          id: job.id,
          title: job.title,
          description: job.description ?? '',
          location: job.location,
          budget: budgetStr,
          category: job.category,
          postedAt: postedAgo,
          icon: Job.getIconForCategory(job.category),
          color: Job.getColorForCategory(job.category),
          isFeatured: job.featuredOrder != null,
          customerId: job.customerId,
          photos: job.photos ?? [],
        ),
      )),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Başlık satırı ──────────────────────────────────────────────
            Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: job.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(job.icon, color: job.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(job.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(job.category,
                        style: TextStyle(fontSize: 12, color: job.color,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              // Fiyat rozeti
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(budgetStr,
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
              ),
            ]),

            const SizedBox(height: 10),

            // ── Açıklama ───────────────────────────────────────────────────
            Text(job.description ?? '',
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                maxLines: 2, overflow: TextOverflow.ellipsis),

            // ── Fotoğraflar ────────────────────────────────────────────────
            if (job.photos != null && job.photos!.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 56,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: job.photos!.length.clamp(0, 4),
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) => ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(job.photos![i],
                        width: 56, height: 56, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                            width: 56, height: 56, color: AppColors.border,
                            child: const Icon(Icons.image_not_supported,
                                size: 18, color: AppColors.textHint))),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 12),

            // ── Alt bilgi ─────────────────────────────────────────────────
            Row(children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textHint),
              const SizedBox(width: 3),
              Expanded(
                child: Text(job.location,
                    style: const TextStyle(fontSize: 12, color: AppColors.textHint),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 8),
              Icon(Icons.access_time, size: 13, color: Colors.grey.shade400),
              const SizedBox(width: 3),
              Text(postedAgo, style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
              const SizedBox(width: 10),
              Icon(Icons.people_alt_outlined, size: 13, color: Colors.grey.shade500),
              const SizedBox(width: 3),
              Text('$offerCount teklif',
                  style: TextStyle(fontSize: 12,
                      color: offerCount > 0 ? AppColors.primary : Colors.grey.shade400,
                      fontWeight: offerCount > 0 ? FontWeight.w600 : FontWeight.normal)),
              const SizedBox(width: 12),
              // Teklif ver butonu
              ElevatedButton(
                onPressed: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => JobDetailScreen(
                    id: job.id,
                    title: job.title,
                    description: job.description ?? '',
                    location: job.location,
                    budget: budgetStr,
                    category: job.category,
                    postedAt: postedAgo,
                    icon: Job.getIconForCategory(job.category),
                    color: Job.getColorForCategory(job.category),
                    isFeatured: job.featuredOrder != null,
                    customerId: job.customerId,
                    photos: job.photos ?? [],
                  ),
                )),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Teklif Ver', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  String _timeAgo(String iso) {
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60)  return '${diff.inMinutes} dk önce';
      if (diff.inHours   < 24)  return '${diff.inHours} saat önce';
      return '${diff.inDays} gün önce';
    } catch (_) {
      return '';
    }
  }
}
