import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/job_repository.dart';
import '../../data/firebase_offer_repository.dart';
import '../../../tokens/data/token_repository.dart';
import 'job_detail_screen.dart';
import 'job_opportunities_screen.dart';
import 'post_job_screen.dart';
import '../providers/job_provider.dart';
import '../../../../l10n/app_localizations.dart';
import '../widgets/boost_dialog.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final myJobsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, customerId) {
  return ref.watch(jobRepositoryProvider).getMyJobs(customerId);
});

final myOffersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(offerRepositoryProvider).getMyOffers();
});

// ─── Screen ───────────────────────────────────────────────────────────────────

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class MyJobsBody extends MyJobsScreen {
  const MyJobsBody({super.key}) : super(showAppBar: false);
}

class MyJobsScreen extends ConsumerWidget {
  final bool showAppBar;
  const MyJobsScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    if (authState is! AuthAuthenticated) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final user = authState.user;
    final userId = user['id'] as String;
    final asWorkerTotal = (user['asWorkerTotal'] as num?)?.toInt() ?? 0;

    if (asWorkerTotal > 0) {
      return _DualRoleView(userId: userId, showAppBar: showAppBar);
    }
    return _DualRoleCheckView(userId: userId, showAppBar: showAppBar);
  }
}

/// Checks if user has any offers, then decides single vs dual view
class _DualRoleCheckView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _DualRoleCheckView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersAsync = ref.watch(myOffersProvider);

    return offersAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => _CustomerJobsView(userId: userId, showAppBar: showAppBar),
      data: (offers) {
        if (offers.isNotEmpty) {
          return _DualRoleView(userId: userId, showAppBar: showAppBar);
        }
        return _CustomerJobsView(userId: userId, showAppBar: showAppBar);
      },
    );
  }
}

// ─── Dual Role View (Customer + Worker tabs) ──────────────────────────────────

class _DualRoleView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _DualRoleView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: showAppBar
            ? AppBar(
                title: Text(AppLocalizations.of(context).myJobsTitle),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.bookmark_border),
                    tooltip: 'Şablonlarım',
                    onPressed: () => context.push('/sablonlarim'),
                  ),
                ],
                bottom: const TabBar(
                  tabs: [
                    Tab(icon: Icon(Icons.person_outline), text: 'İlanlarım'),
                    Tab(icon: Icon(Icons.handyman_outlined), text: 'Tekliflerim'),
                    Tab(icon: Icon(Icons.work_outline), text: 'Fırsatlar'),
                  ],
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                ),
              )
            : null,
        body: const TabBarView(
          children: [
            _CustomerTabContentWrapper(),
            _WorkerTabContent(),
            JobOpportunitiesBody(),
          ],
        ),
      ),
    );
  }
}

// Scaffold olmadan kullanılabilir wrapper
class _CustomerTabContentWrapper extends ConsumerWidget {
  const _CustomerTabContentWrapper();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();
    return _CustomerTabContent(userId: authState.user['id'] as String);
  }
}

// ─── Customer tab content ─────────────────────────────────────────────────────

class _CustomerTabContent extends ConsumerWidget {
  final String userId;
  const _CustomerTabContent({required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(myJobsProvider(userId));

    return jobsAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (jobs) => DefaultTabController(
        length: 3,
        child: Column(
          children: [
            const Material(
              color: Colors.white,
              child: TabBar(
                tabs: [
                  Tab(text: 'Aktif'),
                  Tab(text: 'Tamamlanan'),
                  Tab(text: 'İptal Edilen'),
                ],
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textHint,
                indicatorColor: AppColors.primary,
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _JobList(
                    jobs: jobs
                        .where((j) =>
                            j['status'] == 'open' ||
                            j['status'] == 'in_progress')
                        .toList(),
                    emptyMsg: 'Aktif ilanınız yok.',
                  ),
                  _JobList(
                    jobs:
                        jobs.where((j) => j['status'] == 'completed').toList(),
                    emptyMsg: 'Tamamlanan ilanınız yok.',
                  ),
                  _JobList(
                    jobs:
                        jobs.where((j) => j['status'] == 'cancelled').toList(),
                    emptyMsg: 'İptal edilen ilanınız yok.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Worker tab content ───────────────────────────────────────────────────────

class _WorkerTabContent extends ConsumerWidget {
  const _WorkerTabContent();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersAsync = ref.watch(myOffersProvider);

    return offersAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (offers) {
        if (offers.isEmpty) {
          return EmptyState(
            icon: Icons.handyman_rounded,
            title: 'Henüz teklif vermediniz',
            message: 'İş ilanlarını keşfet, teklif ver ve kazanmaya başla!',
            action: ElevatedButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const JobOpportunitiesScreen(),
              )),
              icon: const Icon(Icons.search),
              label: Text(AppLocalizations.of(context).myJobsExplore),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 12),
              ),
            ),
          );
        }
        return DefaultTabController(
          length: 4,
          child: Column(
            children: [
              const Material(
                color: Colors.white,
                child: TabBar(
                  isScrollable: true,
                  tabs: [
                    Tab(text: 'Bekleyen'),
                    Tab(text: 'Kabul Edilen'),
                    Tab(text: 'Reddedilen'),
                    Tab(text: 'Tümü'),
                  ],
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textHint,
                  indicatorColor: AppColors.primary,
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _OfferList(
                      offers: offers
                          .where((o) => o['status'] == 'pending')
                          .toList(),
                      emptyMsg: 'Bekleyen teklifiniz yok.',
                    ),
                    _OfferList(
                      offers: offers
                          .where((o) => o['status'] == 'accepted')
                          .toList(),
                      emptyMsg: 'Kabul edilen teklifiniz yok.',
                    ),
                    _OfferList(
                      offers: offers
                          .where((o) => o['status'] == 'rejected')
                          .toList(),
                      emptyMsg: 'Reddedilen teklifiniz yok.',
                    ),
                    _OfferList(
                      offers: offers,
                      emptyMsg: 'Henüz teklif vermediniz.',
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─── Müşteri: kendi ilanları (single-role fallback) ──────────────────────────

class _CustomerJobsView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _CustomerJobsView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(myJobsProvider(userId));

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: showAppBar
            ? AppBar(
                title: Text(AppLocalizations.of(context).myJobsListings),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.bookmark_border),
                    tooltip: 'Şablonlarım',
                    onPressed: () => context.push('/sablonlarim'),
                  ),
                ],
                bottom: const TabBar(
                  tabs: [
                    Tab(text: 'Aktif'),
                    Tab(text: 'Tamamlanan'),
                    Tab(text: 'İptal Edilen'),
                  ],
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                ),
              )
            : null,
        body: jobsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
          data: (jobs) => TabBarView(
            children: [
              _JobList(
                jobs: jobs
                    .where((j) =>
                        j['status'] == 'open' || j['status'] == 'in_progress')
                    .toList(),
                emptyMsg: 'Aktif ilanınız yok.',
              ),
              _JobList(
                jobs: jobs.where((j) => j['status'] == 'completed').toList(),
                emptyMsg: 'Tamamlanan ilanınız yok.',
              ),
              _JobList(
                jobs: jobs.where((j) => j['status'] == 'cancelled').toList(),
                emptyMsg: 'İptal edilen ilanınız yok.',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _JobList extends StatelessWidget {
  final List<Map<String, dynamic>> jobs;
  final String emptyMsg;
  const _JobList({required this.jobs, required this.emptyMsg});

  @override
  Widget build(BuildContext context) {
    if (jobs.isEmpty) {
      return EmptyState(
        icon: Icons.work_outline_rounded,
        title: 'Henüz iş yok',
        message: emptyMsg,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: jobs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _CustomerJobCard(job: jobs[i]),
    );
  }
}

class _OfferList extends StatelessWidget {
  final List<Map<String, dynamic>> offers;
  final String emptyMsg;
  const _OfferList({required this.offers, required this.emptyMsg});

  @override
  Widget build(BuildContext context) {
    if (offers.isEmpty) {
      return EmptyState(
        icon: Icons.local_offer_outlined,
        title: 'Teklif yok',
        message: emptyMsg,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: offers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _WorkerOfferCard(offer: offers[i]),
    );
  }
}

class _CustomerJobCard extends ConsumerWidget {
  final Map<String, dynamic> job;
  const _CustomerJobCard({required this.job});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = job['status'] as String? ?? 'open';
    final title = job['title'] as String? ?? '';
    final category = job['category'] as String? ?? '';
    final budgetMin = (job['budgetMin'] as num?)?.toInt() ?? 0;
    final budgetMax = (job['budgetMax'] as num?)?.toInt() ?? 0;
    final createdAt = job['createdAt'] as String? ?? '';
    final dateStr = createdAt.isNotEmpty
        ? createdAt.substring(0, 10).split('-').reversed.join('.')
        : '';
    final photos =
        (job['photos'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            [];

    final featuredUntilRaw = job['featuredUntil'] as String?;
    final featuredUntil =
        featuredUntilRaw != null ? DateTime.tryParse(featuredUntilRaw) : null;
    final isBoosted =
        featuredUntil != null && featuredUntil.isAfter(DateTime.now());
    final canBoost = status == 'open' && !isBoosted;

    final (statusLabel, statusColor) = switch (status) {
      'open' => ('Açık', Colors.green),
      'in_progress' => ('Devam Ediyor', Colors.blue),
      'completed' => ('Tamamlandı', Colors.teal),
      'cancelled' => ('İptal', Colors.red),
      _ => ('Bilinmiyor', Colors.grey),
    };

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => JobDetailScreen(
            id: job['id'] as String,
            title: title,
            description: job['description'] as String? ?? '',
            location: job['location'] as String? ?? '',
            budget: '$budgetMin - $budgetMax ₺',
            category: category,
            postedAt: dateStr,
            icon: Job.getIconForCategory(category),
            color: Job.getColorForCategory(category),
            isFeatured: job['featuredOrder'] != null,
            customerId: job['customerId'] as String?,
            photos: (job['photos'] as List<dynamic>?)
                    ?.map((e) => e.toString())
                    .toList() ??
                [],
          ),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: statusColor.withValues(alpha: 0.3), width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 5),
                        decoration: BoxDecoration(
                            color: statusColor, shape: BoxShape.circle),
                      ),
                      Text(statusLabel,
                          style: TextStyle(
                              color: statusColor,
                              fontSize: 12,
                              fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isBoosted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('🚀 Öne Çıkmış',
                            style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600)),
                      )
                    else if (canBoost)
                      InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () async {
                          final ok = await BoostDialog.show(
                              context, job['id'] as String);
                          if (ok == true) {
                            final customerId = job['customerId'] as String?;
                            if (customerId != null) {
                              ref.invalidate(myJobsProvider(customerId));
                            }
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.3)),
                          ),
                          child: const Text('🚀 Öne Çıkar',
                              style: TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(dateStr,
                        style: const TextStyle(
                            color: AppColors.textHint, fontSize: 12)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text(category,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 12)),
            if (photos.isNotEmpty) ...[
              const SizedBox(height: 8),
              SizedBox(
                height: 56,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: photos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) => ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      photos[i],
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 56,
                        height: 56,
                        color: AppColors.border,
                        child: const Icon(Icons.image_not_supported,
                            size: 18, color: AppColors.textHint),
                      ),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('$budgetMin - $budgetMax ₺',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
                Row(
                  children: [
                    Text(AppLocalizations.of(context).myJobsViewDetails,
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                    const Icon(Icons.chevron_right,
                        size: 16, color: AppColors.primary),
                  ],
                ),
              ],
            ),
            if (status == 'completed' || status == 'cancelled') ...[
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PostJobScreen(initialJob: job),
                      ),
                    );
                  },
                  icon: const Text('🔁', style: TextStyle(fontSize: 14)),
                  label: Text(AppLocalizations.of(context).myJobsRepost),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
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

class _WorkerOfferCard extends ConsumerWidget {
  final Map<String, dynamic> offer;
  const _WorkerOfferCard({required this.offer});

  Future<void> _withdraw(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.of(context).myJobsWithdrawOffer),
        content: const Text(
            'Bu teklifi geri çekiyorsun. 5 token iade alacaksın. Devam edilsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(AppLocalizations.of(context).cancel),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(AppLocalizations.of(context).myJobsWithdraw),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    if (!context.mounted) return;

    try {
      final res =
          await ref.read(offerRepositoryProvider).withdrawOffer(jobId, offerId);
      ref.invalidate(myOffersProvider);
      ref.invalidate(tokenBalanceProvider);
      if (!context.mounted) return;
      final refunded = res['refunded'] == true;
      final amount = (res['refundAmount'] as num?)?.toInt() ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: refunded ? Colors.green : Colors.orange,
        content: Text(refunded
            ? 'Teklif geri çekildi. $amount token iade edildi.'
            : 'Teklif geri çekildi.'),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = offer['status'] as String? ?? 'pending';
    final price = (offer['price'] as num?)?.toDouble() ?? 0.0;
    final message = offer['message'] as String? ?? '';
    final counterPrice = (offer['counterPrice'] as num?)?.toDouble();
    final counterMessage = offer['counterMessage'] as String?;
    final job = offer['job'] as Map<String, dynamic>?;
    final jobTitle = job?['title'] as String? ?? 'Bilinmeyen İlan';
    final jobCategory = job?['category'] as String? ?? '';
    final jobLocation = job?['location'] as String? ?? '';
    final createdAt = offer['createdAt'] as String? ?? '';
    final dateStr = createdAt.isNotEmpty
        ? createdAt.substring(0, 10).split('-').reversed.join('.')
        : '';

    final (statusLabel, statusColor) = switch (status) {
      'pending' => ('Bekliyor', Colors.orange),
      'accepted' => ('Kabul Edildi', Colors.green),
      'rejected' => ('Reddedildi', Colors.red),
      'withdrawn' => ('Geri Çekildi', Colors.grey),
      'countered' => ('Pazarlık', Colors.blue),
      _ => ('Bilinmiyor', Colors.grey),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: statusColor.withValues(alpha: 0.3), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(right: 5),
                      decoration: BoxDecoration(
                          color: statusColor, shape: BoxShape.circle),
                    ),
                    Text(statusLabel,
                        style: TextStyle(
                            color: statusColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Text(dateStr,
                  style:
                      const TextStyle(color: AppColors.textHint, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 10),
          Text(jobTitle,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 4),
          if (jobCategory.isNotEmpty)
            Text(jobCategory,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 12)),
          if (jobLocation.isNotEmpty) ...[
            const SizedBox(height: 2),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 12, color: AppColors.textHint),
                const SizedBox(width: 2),
                Text(jobLocation,
                    style: const TextStyle(
                        color: AppColors.textHint, fontSize: 12)),
              ],
            ),
          ],
          if (message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(message,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
            ),
          ],
          if (counterPrice != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Karşı Teklif: ${IntlFormatter.currency(context, counterPrice, decimalDigits: 0)}',
                      style: TextStyle(
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.bold,
                          fontSize: 13)),
                  if (counterMessage != null && counterMessage.isNotEmpty)
                    Text(counterMessage,
                        style: TextStyle(
                            color: Colors.blue.shade600, fontSize: 12)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text('Teklifiniz: ${IntlFormatter.currency(context, price, decimalDigits: 0)}',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13)),
          if (status == 'pending' || status == 'countered') ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _withdraw(context, ref),
                icon: const Icon(Icons.undo, size: 16),
                label: Text(AppLocalizations.of(context).myJobsWithdraw),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.error,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
