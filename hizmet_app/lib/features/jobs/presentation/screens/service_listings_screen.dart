import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/overflow_slide_row.dart';
import '../../../categories/data/category_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/job_filter.dart';
import '../../widgets/job_filter_sheet.dart';
import '../providers/job_provider.dart';
import '../widgets/job_preview_sheet.dart';
import 'job_detail_screen.dart';

/// Phase Two-Sided — Hizmet İlanları (kind='offer').
/// Müşteri perspektifinden, ustaların yayınladığı hizmet ilanlarını listeler.
/// AppBar'sız body — TabBarView içinde kullanılır.
class ServiceListingsBody extends ServiceListingsScreen {
  const ServiceListingsBody({super.key}) : super(showAppBar: false);
}

class ServiceListingsScreen extends ConsumerStatefulWidget {
  final bool showAppBar;
  const ServiceListingsScreen({super.key, this.showAppBar = true});

  @override
  ConsumerState<ServiceListingsScreen> createState() =>
      _ServiceListingsScreenState();
}

class _ServiceListingsScreenState
    extends ConsumerState<ServiceListingsScreen> {
  String? _activeCategory;
  String _searchQuery = '';
  Timer? _debounce;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _applyProximity();
  }

  /// Map'te zaten verilmiş konum iznini yeniden kullanır (yeni izin istemez);
  /// varsa konumu provider'a geçirir → liste yakınlığa göre sıralanır.
  Future<void> _applyProximity() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 6));
      if (!mounted) return;
      ref
          .read(serviceListingsProvider.notifier)
          .setLocation(pos.latitude, pos.longitude);
    } catch (_) {
      // konum alınamazsa sessiz geç — liste normal sırada kalır
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _selectCategory(String? category) {
    setState(() => _activeCategory = category);
    ref.read(serviceListingsProvider.notifier).fetchJobs(
          category: category,
          q: _searchQuery.isEmpty ? null : _searchQuery,
        );
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _searchQuery = value.trim();
      ref
          .read(serviceListingsProvider.notifier)
          .setQuery(_searchQuery);
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

  void _openPost() {
    final isLoggedIn = ref.read(authStateProvider) is AuthAuthenticated;
    if (!isLoggedIn) {
      context.push('/giris-yap', extra: {'returnTo': '/hizmet-ilani-ver'});
      return;
    }
    final user = (ref.read(authStateProvider) as AuthAuthenticated).user;
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Hizmet ilanı yayınlamak için önce profilinize uzmanlık kategorisi ekleyin.')),
      );
      return;
    }
    context.push('/hizmet-ilani-ver');
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(serviceListingsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final activeFilterCount = ref.watch(jobFilterProvider).activeCount;
    final authState = ref.watch(authStateProvider);
    final myUserId = authState is AuthAuthenticated
        ? authState.user['id'] as String?
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: widget.showAppBar
          ? AppBar(
              title: const Text('Hizmet İlanları'),
              backgroundColor: AppColors.background,
              foregroundColor: AppColors.textPrimary,
            )
          : null,
      body: Column(
        children: [
          _buildSearchAndFilter(categoriesAsync, activeFilterCount),
          Expanded(
            child: jobsAsync.when(
              data: (jobs) => jobs.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(serviceListingsProvider.notifier).fetchJobs(
                                category: _activeCategory,
                                q: _searchQuery.isEmpty ? null : _searchQuery,
                              ),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: jobs.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (_, i) => _ServiceListingCard(
                            job: jobs[i], myUserId: myUserId),
                      ),
                    ),
              loading: () => ListSkeleton(
                itemCount: 6,
                itemBuilder: (_) => const JobCardSkeleton(),
              ),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Hata: $e',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSecondary)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter(
      AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
      int activeFilterCount) {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Hizmet ara...',
                      hintStyle: TextStyle(color: AppColors.textHint),
                      prefixIcon:
                          Icon(Icons.search, color: AppColors.textHint),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _filterButton(activeFilterCount),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 34,
            child: categoriesAsync.when(
              data: (cats) => ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _chip('Tümü', null, _activeCategory == null),
                  ...cats.map((c) => _chip(
                        '${c['icon'] ?? ''} ${c['name'] ?? ''}'.trim(),
                        c['name'] as String?,
                        _activeCategory == c['name'],
                      )),
                ],
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, String? value, bool active) => GestureDetector(
        onTap: () => _selectCategory(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.only(right: 8),
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: active ? Colors.white : AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: active ? Colors.white : AppColors.border),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active ? Colors.black : AppColors.textPrimary,
            ),
          ),
        ),
      );

  Widget _filterButton(int activeCount) {
    final hasActive = activeCount > 0;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: hasActive ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _openFilterSheet,
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              child: Icon(Icons.tune_rounded,
                  color: hasActive ? Colors.black : AppColors.textPrimary,
                  size: 22),
            ),
          ),
        ),
        if (hasActive)
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
                border: Border.all(color: AppColors.background, width: 1.5),
              ),
              child: Text('$activeCount',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ),
          ),
      ],
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
    return EmptyState(
      icon: Icons.workspace_premium_outlined,
      title: 'Henüz hizmet ilanı yok',
      message: 'Usta isen hemen ilk hizmet ilanını yayınla!',
      action: ElevatedButton.icon(
        onPressed: _openPost,
        icon: const Icon(Icons.add),
        label: const Text('Hizmet İlanı Ver'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );
  }
}

/// Hizmet ilanı kartı — usta perspektifinden (müşteri görür).
class _ServiceListingCard extends StatelessWidget {
  final Job job;
  final String? myUserId;
  const _ServiceListingCard({required this.job, this.myUserId});

  @override
  Widget build(BuildContext context) {
    // offer ilanlarında job.customerId = ilanı yayınlayan USTA'nın id'si.
    final isOwner = myUserId != null && job.customerId == myUserId;
    return GestureDetector(
      // Phase 436 — tap → bottom sheet preview; long-press → full detail.
      onTap: () => JobPreviewSheet.show(context, job.id, jobObj: job),
      onLongPress: () => Navigator.push(
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
          color: AppColors.surface,
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
                    Text('Öne Çıkan Hizmet',
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
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(job.budget,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: AppColors.primary)),
                ),
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
                          width: 90,
                          color: AppColors.surfaceElevated),
                      errorWidget: (_, __, ___) => Container(
                          width: 90,
                          color: AppColors.surfaceElevated,
                          child: Icon(Icons.broken_image_outlined,
                              color: AppColors.textHint, size: 20)),
                    ),
                  ),
                ),
              ),
            ],
            if (job.poster != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: _PosterStrip(poster: job.poster!),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                const Spacer(),
                // Kendi ilanımsa "Teklif Al" yerine rozet (kendine randevu/teklif
                // talebi olmaz). Aksi halde müşteri ustanın profiline gider.
                if (isOwner)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.person_rounded,
                            size: 16, color: AppColors.primary),
                        SizedBox(width: 6),
                        Text('Bu sizin ilanınız',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary)),
                      ],
                    ),
                  )
                else
                  ElevatedButton.icon(
                    // Phase Two-Sided: offer-tipi ilanlarda job.customerId aslında
                    // ilanı yayınlayan USTA'nın id'si. Müşteri teklif/randevu
                    // talebi için ustanın public profile'ına gitmeli — orada
                    // "Randevu Al" CTA müşteriyi /randevu-olustur/:workerId
                    // akışına yönlendiriyor.
                    onPressed: () => context.push('/profil/${job.customerId}'),
                    icon: const Icon(Icons.handshake_rounded, size: 16),
                    label: const Text('Teklif Al'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// İlan sahibi (usta) kompakt profil şeridi: avatar + doğrulama + puan +
/// derece (itibar sayısı + seviye etiketi) + başarı oranı.
class _PosterStrip extends StatelessWidget {
  final JobPoster poster;
  const _PosterStrip({required this.poster});

  @override
  Widget build(BuildContext context) {
    final rate = poster.successRate;
    return Row(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              backgroundImage: poster.profileImageUrl != null
                  ? CachedNetworkImageProvider(poster.profileImageUrl!)
                  : null,
              child: poster.profileImageUrl == null
                  ? Text(
                      poster.fullName.isNotEmpty
                          ? trUpper(poster.fullName[0])
                          : '?',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary),
                    )
                  : null,
            ),
            if (poster.identityVerified)
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  decoration: const BoxDecoration(
                      color: AppColors.primary, shape: BoxShape.circle),
                  padding: const EdgeInsets.all(2),
                  child: const Icon(Icons.verified,
                      size: 12, color: Colors.white),
                ),
              ),
          ],
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                poster.fullName.isEmpty ? 'Usta' : poster.fullName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              // Phase 429 — Wrap → OverflowSlideRow (uzun isim + 3 chip
              // mini kartta multi-line yapmasın; yatay slide + oklar).
              OverflowSlideRow(
                spacing: 6,
                height: 24,
                children: [
                  _miniChip(
                    Icons.star_rounded,
                    AppColors.warning,
                    poster.totalReviews > 0
                        ? '${poster.averageRating.toStringAsFixed(1)} (${poster.totalReviews})'
                        : 'Yeni',
                  ),
                  _miniChip(
                    Icons.military_tech_rounded,
                    AppColors.primary,
                    '${poster.effectiveScore} · ${poster.levelLabel}',
                  ),
                  if (rate != null)
                    _miniChip(
                      Icons.check_circle_rounded,
                      AppColors.success,
                      '%$rate başarı',
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _miniChip(IconData icon, Color color, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 3),
          Text(text,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}
