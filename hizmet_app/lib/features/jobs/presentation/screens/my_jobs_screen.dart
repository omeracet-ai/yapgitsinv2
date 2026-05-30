import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/job_repository.dart';
import '../../data/offer_repository.dart';
import '../../../tokens/data/token_repository.dart';
import 'job_opportunities_screen.dart';
import 'post_job_screen.dart';
import '../../../../l10n/app_localizations.dart';
import '../widgets/boost_dialog.dart';
import '../widgets/job_history_dialog.dart';
import '../widgets/pending_confirmations_card.dart';

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
                automaticallyImplyLeading: false,
                titleSpacing: 0,
                backgroundColor: AppColors.headerBackground(context),
                foregroundColor: Colors.white,
                // "İşlerim" başlığı kaldırıldı; TabBar üstte tek satır olarak
                // gözükür ve sağda bildirim + şablonlarım hizalı.
                title: const TabBar(
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  tabs: [
                    Tab(icon: Icon(Icons.assignment_outlined), text: 'Aktif İlanlarım'),
                    Tab(icon: Icon(Icons.handyman_outlined), text: 'Tekliflerim'),
                    Tab(icon: Icon(Icons.check_circle_outline), text: 'Biten İşler'),
                  ],
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.bookmark_border),
                    tooltip: 'Şablonlarım',
                    onPressed: () => context.push('/sablonlarim'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    tooltip: 'Bildirimler',
                    onPressed: () => context.push('/bildirim-ayarlari'),
                  ),
                  const SizedBox(width: 4),
                ],
              )
            : null,
        body: const Column(
          children: [
            // Phase 271 — onay bekleyen işler (confirm-plain entegrasyonu).
            PendingConfirmationsCard(),
            Expanded(
              child: TabBarView(
                children: [
                  // Phase 302 — Aktif İlanlarım: tüm kindler, open/in_progress
                  _CustomerJobsByStatus(statuses: ['open', 'in_progress'],
                      emptyMsg: 'Aktif ilanınız yok.'),
                  _WorkerTabContent(),
                  _CustomerJobsByStatus(statuses: ['completed'],
                      emptyMsg: 'Tamamlanan işiniz yok.'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Phase 302 — Customer jobs filtered by status (no inner tabs) ────────────
//
// Yeni İşlerim sekmesinde Aktif İlanlarım / Biten İşler tabları için
// statü-bazlı düz liste. İçeride alt-tab yok — tek scroll.
class _CustomerJobsByStatus extends ConsumerWidget {
  final List<String> statuses;
  final String emptyMsg;
  const _CustomerJobsByStatus({required this.statuses, required this.emptyMsg});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();
    final userId = authState.user['id'] as String;
    final jobsAsync = ref.watch(myJobsProvider(userId));
    return jobsAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (allJobs) {
        final filtered = allJobs
            .where((j) => statuses.contains(j['status'] as String?))
            .toList();
        return _JobList(jobs: filtered, emptyMsg: emptyMsg);
      },
    );
  }
}

// ─── Worker tab content ───────────────────────────────────────────────────────

// Phase 303 — Tekliflerim alt sekmeleri tek dropdown filtre butonuna indirildi.
// Sıra: Tümü → Bekleyen → Kabul Edilen → Reddedilen.
enum _OfferFilter { all, pending, accepted, rejected }

extension _OfferFilterLabel on _OfferFilter {
  String get label => switch (this) {
        _OfferFilter.all => 'Tümü',
        _OfferFilter.pending => 'Bekleyen',
        _OfferFilter.accepted => 'Kabul Edilen',
        _OfferFilter.rejected => 'Reddedilen',
      };

  IconData get icon => switch (this) {
        _OfferFilter.all => Icons.list_alt_outlined,
        _OfferFilter.pending => Icons.schedule_outlined,
        _OfferFilter.accepted => Icons.check_circle_outline,
        _OfferFilter.rejected => Icons.cancel_outlined,
      };
}

class _WorkerTabContent extends ConsumerStatefulWidget {
  const _WorkerTabContent();

  @override
  ConsumerState<_WorkerTabContent> createState() => _WorkerTabContentState();
}

class _WorkerTabContentState extends ConsumerState<_WorkerTabContent> {
  _OfferFilter _filter = _OfferFilter.all;

  List<Map<String, dynamic>> _apply(List<Map<String, dynamic>> offers) {
    switch (_filter) {
      case _OfferFilter.all:
        return offers;
      case _OfferFilter.pending:
        // Phase 262 — countered (karşı teklif bekleyen) da burada görünsün.
        return offers
            .where((o) =>
                o['status'] == 'pending' || o['status'] == 'countered')
            .toList();
      case _OfferFilter.accepted:
        return offers.where((o) => o['status'] == 'accepted').toList();
      case _OfferFilter.rejected:
        return offers.where((o) => o['status'] == 'rejected').toList();
    }
  }

  String _emptyMsg() => switch (_filter) {
        _OfferFilter.all => 'Henüz teklif vermediniz.',
        _OfferFilter.pending => 'Bekleyen teklifiniz yok.',
        _OfferFilter.accepted => 'Kabul edilen teklifiniz yok.',
        _OfferFilter.rejected => 'Reddedilen teklifiniz yok.',
      };

  @override
  Widget build(BuildContext context) {
    final offersAsync = ref.watch(myOffersProvider);

    return offersAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (allOffers) {
        // Phase 262 — pazarlık zincirinde sadece KÖK teklifi göster (re-counter
        // child halkaları köke senkronlandı; mükerrer kart önlenir).
        final offers =
            allOffers.where((o) => o['parentOfferId'] == null).toList();
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
        final filtered = _apply(offers);
        return Column(
          children: [
            Container(
              color: AppColors.surface,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: PopupMenuButton<_OfferFilter>(
                      initialValue: _filter,
                      onSelected: (v) => setState(() => _filter = v),
                      itemBuilder: (_) => _OfferFilter.values
                          .map((f) => PopupMenuItem(
                                value: f,
                                child: Row(
                                  children: [
                                    Icon(f.icon,
                                        size: 18,
                                        color: f == _filter
                                            ? AppColors.primary
                                            : AppColors.textSecondary),
                                    const SizedBox(width: 10),
                                    Text(f.label,
                                        style: TextStyle(
                                            color: f == _filter
                                                ? AppColors.primary
                                                : AppColors.textPrimary,
                                            fontWeight: f == _filter
                                                ? FontWeight.w600
                                                : FontWeight.w400)),
                                  ],
                                ),
                              ))
                          .toList(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: AppColors.primary
                                  .withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(_filter.icon,
                                size: 18, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_filter.label,
                                  style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13.5)),
                            ),
                            Text('${filtered.length}',
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12)),
                            const SizedBox(width: 6),
                            const Icon(Icons.arrow_drop_down,
                                color: AppColors.primary),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _OfferList(
                offers: filtered,
                emptyMsg: _emptyMsg(),
              ),
            ),
          ],
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
                backgroundColor: AppColors.headerBackground(context),
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.bookmark_border),
                    tooltip: 'Şablonlarım',
                    onPressed: () => context.push('/sablonlarim'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    tooltip: 'Bildirimler',
                    onPressed: () => context.push('/bildirim-ayarlari'),
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
        body: Column(
          children: [
            // Phase 271 — onay bekleyen işler kartı (varsa).
            const PendingConfirmationsCard(),
            Expanded(
              child: jobsAsync.when(
                loading: () => ListSkeleton(
                    itemCount: 6,
                    itemBuilder: (_) => const JobCardSkeleton()),
                error: (e, _) => Center(child: Text('Hata: $e')),
                data: (jobs) => TabBarView(
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
                      jobs: jobs
                          .where((j) => j['status'] == 'completed')
                          .toList(),
                      emptyMsg: 'Tamamlanan ilanınız yok.',
                    ),
                    _JobList(
                      jobs: jobs
                          .where((j) => j['status'] == 'cancelled')
                          .toList(),
                      emptyMsg: 'İptal edilen ilanınız yok.',
                    ),
                  ],
                ),
              ),
            ),
          ],
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: jobs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: offers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
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

    // Phase 267 — completed/pending_grace job cards: yeşil 2px border + radius
    // ve sağ üst köşede "Hizmet Tamamlandı" rozet'i.
    final confirmationStatus = job['confirmationStatus'] as String?;
    final isCompletedVisual = status == 'completed' ||
        confirmationStatus == 'pending_grace' ||
        confirmationStatus == 'completed';

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => JobHistoryDialog.show(context, job),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCompletedVisual
                ? AppColors.success
                : AppColors.border,
            width: isCompletedVisual ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                isCompletedVisual
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded,
                                color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text('Hizmet Tamamlandı',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700)),
                          ],
                        ),
                      )
                    : Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: statusColor.withValues(alpha: 0.3),
                              width: 1),
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
                        style: TextStyle(
                            color: AppColors.textHint, fontSize: 12)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (photos.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(
                      photos.first,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 40,
                        height: 40,
                        color: AppColors.border,
                        child: Icon(Icons.image_not_supported,
                            size: 14, color: AppColors.textHint),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Expanded(
                            child: Text(category,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11)),
                          ),
                          if (budgetMin > 0 || budgetMax > 0)
                            Text(IntlFormatter.tlRange(budgetMin, budgetMax),
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    size: 18, color: AppColors.primary),
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
            'Bu teklifi geri çekiyorsun. 5 kredi iade alacaksın. Devam edilsin mi?'),
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
            ? 'Teklif geri çekildi. $amount kredi iade edildi.'
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

  // Phase 262 — gelen karşı teklifi kabul et (anlaşılan fiyatla iş başlar).
  Future<void> _acceptCounter(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;
    try {
      await ref.read(offerRepositoryProvider).acceptCounter(jobId, offerId);
      ref.invalidate(myOffersProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        backgroundColor: Colors.green,
        content: Text('Karşı teklif kabul edildi!'),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  // Phase 262 — yeniden pazarlık (teklif veren taraf için yarım kredi keser).
  Future<void> _recounter(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;
    final controller = TextEditingController(
      text: ((offer['counterPrice'] as num?) ?? (offer['price'] as num?))
              ?.toStringAsFixed(0) ??
          '',
    );
    final msgController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tekrar Teklif'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: 'Yeni fiyat (₺)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: msgController,
              decoration: const InputDecoration(
                  labelText: 'Mesaj (opsiyonel)',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            Text('Yeniden pazarlık 2.5 kredi keser.',
                style: TextStyle(fontSize: 12, color: AppColors.textHint)),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(AppLocalizations.of(context).cancel)),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Gönder')),
        ],
      ),
    );
    if (result != true) return;
    final price = double.tryParse(controller.text.trim().replaceAll(',', '.'));
    if (price == null || price <= 0) return;
    if (!context.mounted) return;
    try {
      await ref
          .read(offerRepositoryProvider)
          .counterOffer(jobId, offerId, price, msgController.text.trim());
      ref.invalidate(myOffersProvider);
      ref.invalidate(tokenBalanceProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        backgroundColor: Colors.blue,
        content: Text('Karşı teklif gönderildi.'),
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
    // Phase 174 fallback — price null gelirse priceMinor (kuruş) → TL'ye çevir.
    final priceMinor = (offer['priceMinor'] as num?)?.toInt();
    final counterMinor = (offer['counterPriceMinor'] as num?)?.toInt();
    final price = (offer['price'] as num?)?.toDouble()
        ?? (priceMinor != null ? priceMinor / 100 : 0.0);
    final message = offer['message'] as String? ?? '';
    final counterPrice = (offer['counterPrice'] as num?)?.toDouble()
        ?? (counterMinor != null ? counterMinor / 100 : null);
    final counterMessage = offer['counterMessage'] as String?;
    // Phase 265d — defensive cast (string id vs Map)
    final jobRaw = offer['job'];
    final job = jobRaw is Map ? Map<String, dynamic>.from(jobRaw) : null;
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2)),
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
                      TextStyle(color: AppColors.textHint, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 6),
          Text(jobTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
          const SizedBox(height: 2),
          Row(
            children: [
              if (jobCategory.isNotEmpty)
                Text(jobCategory,
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 11)),
              if (jobCategory.isNotEmpty && jobLocation.isNotEmpty)
                Text(' • ',
                    style:
                        TextStyle(color: AppColors.textHint, fontSize: 11)),
              if (jobLocation.isNotEmpty)
                Expanded(
                  child: Text(jobLocation,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: AppColors.textHint, fontSize: 11)),
                ),
            ],
          ),
          if (message.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(message,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 11, color: AppColors.textSecondary)),
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
          const SizedBox(height: 4),
          Text('Teklifiniz: ${IntlFormatter.currency(context, price, decimalDigits: 0)}',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12)),
          // Phase 262 — karşı teklif geldiğinde: Kabul Et + Tekrar Teklif.
          if (status == 'countered') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _acceptCounter(context, ref),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Kabul Et'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _recounter(context, ref),
                    icon: const Icon(Icons.handshake_outlined, size: 16),
                    label: const Text('Tekrar Teklif'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.blue,
                      side: const BorderSide(color: Colors.blue),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
              ],
            ),
          ],
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
