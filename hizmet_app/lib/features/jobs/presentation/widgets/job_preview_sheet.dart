import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/job_photo_carousel.dart';
import '../../data/job_repository.dart';
import '../providers/job_provider.dart';
import '../screens/job_detail_screen.dart';

/// Phase 436 — İlan listesi tap → alttan açılan dikey slider'lı detay önizleme.
///
/// Kart tap → bu bottom sheet (drag-handle, snap 0.4/0.7/0.95).
/// "Detayı Aç" CTA veya alanına tek tap → tam [JobDetailScreen].
///
/// `jobObj` listeden gelen Job'ı doğrudan kullanır (loading flicker yok);
/// arka planda [jobDetailProvider] tam detayı çeker, gelir gelmez UI
/// zenginleşir.
class JobPreviewSheet extends ConsumerWidget {
  final String jobId;
  final Job? seed;
  final ScrollController scrollController;

  const JobPreviewSheet({
    super.key,
    required this.jobId,
    required this.scrollController,
    this.seed,
  });

  static Future<void> show(
    BuildContext context,
    String jobId, {
    Job? jobObj,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      useSafeArea: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        snap: true,
        snapSizes: const [0.4, 0.7, 0.95],
        builder: (ctx, scrollCtl) => JobPreviewSheet(
          jobId: jobId,
          seed: jobObj,
          scrollController: scrollCtl,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(jobDetailProvider(jobId));
    final detailMap = detailAsync.asData?.value;
    final detailJob =
        detailMap != null ? Job.fromMap(detailMap) : null;
    // Seed varsa onu göster, gelir gelmez detayla üzerine yaz.
    final job = detailJob ?? seed;

    return Semantics(
      label: job != null
          ? '${job.title} detay önizleme'
          : 'İlan detay önizleme',
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(22),
          ),
          border: Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 24,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            _DragHandle(),
            _HeaderBar(
              onClose: () => Navigator.of(context).pop(),
              onOpenFull: job == null
                  ? null
                  : () => _openFull(context, job),
            ),
            Expanded(
              child: _Body(
                scrollController: scrollController,
                job: job,
                loading: job == null && detailAsync.isLoading,
                error: detailAsync.hasError && seed == null
                    ? detailAsync.error.toString()
                    : null,
              ),
            ),
            if (job != null)
              _StickyCta(
                onOpenFull: () => _openFull(context, job),
                // Phase 467 — Teklif Ver: detay sayfasına geç ve bid sheet'i
                // otomatik aç (kullanıcı doğrudan teklif metnine ulaşsın).
                onOffer: () => _openFull(context, job, openBid: true),
              ),
          ],
        ),
      ),
    );
  }

  void _openFull(BuildContext context, Job job, {bool openBid = false}) {
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => JobDetailScreen(
          id: job.id,
          title: job.title,
          description: job.description ?? job.desc,
          location: job.location,
          budget: job.budget,
          category: job.category,
          postedAt: job.time,
          icon: job.icon,
          color: job.color,
          isFeatured: job.isFeatured,
          customerId: job.customerId,
          photos: job.photos ?? const [],
          openBidOnLoad: openBid,
        ),
      ),
    );
  }
}

class _DragHandle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 6),
      child: Semantics(
        button: true,
        label: 'Sürükle veya kapat',
        child: Container(
          width: 44,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.textHint.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
}

class _HeaderBar extends StatelessWidget {
  final VoidCallback onClose;
  final VoidCallback? onOpenFull;
  const _HeaderBar({required this.onClose, this.onOpenFull});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          Semantics(
            button: true,
            label: 'Kapat',
            child: IconButton(
              icon: Icon(Icons.close, color: AppColors.textPrimary),
              onPressed: onClose,
              tooltip: 'Kapat',
            ),
          ),
          const Spacer(),
          // Phase 448 (hatalar.txt #12) — Sağ üstteki "Detayı Aç" TextButton
          // kaldırıldı. Aynı işlevi alt sticky bar üstlenmiş durumda — duplicate
          // önlenmiş oldu.
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final ScrollController scrollController;
  final Job? job;
  final bool loading;
  final String? error;
  const _Body({
    required this.scrollController,
    required this.job,
    required this.loading,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (job == null && loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (job == null && error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Önizleme yüklenemedi.\n$error',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }
    final j = job!;
    final photos = j.photos ?? const <String>[];
    final desc = (j.description?.isNotEmpty == true ? j.description! : j.desc);
    final preview = desc.length > 200 ? '${desc.substring(0, 200)}…' : desc;

    return SingleChildScrollView(
      controller: scrollController,
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photos.isNotEmpty) ...[
            const SizedBox(height: 4),
            JobPhotoCarousel(photos: photos),
            const SizedBox(height: 12),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  j.title,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MiniChip(
                      icon: j.icon,
                      label: j.category.isEmpty ? 'Genel' : j.category,
                      color: j.color,
                    ),
                    if (j.dueDate != null && j.dueDate!.isNotEmpty)
                      _MiniChip(
                        icon: Icons.event_outlined,
                        label: j.dueDate!,
                        color: AppColors.accentYellow,
                      ),
                    if (j.scheduleFlexibility == 'urgent')
                      _MiniChip(
                        icon: Icons.bolt_rounded,
                        label: 'Acil',
                        color: AppColors.error,
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                _BudgetRow(budget: j.budget),
                const SizedBox(height: 14),
                _PosterCard(poster: j.poster),
                const SizedBox(height: 14),
                if (preview.isNotEmpty)
                  Text(
                    preview,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                if (desc.length > 200) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Devamını oku…',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined,
                        size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        j.location.isEmpty ? 'Konum belirtilmedi' : j.location,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _StatPill(
                      icon: Icons.local_offer_outlined,
                      label: '${j.offerCount} teklif',
                    ),
                    const SizedBox(width: 8),
                    if (j.time.isNotEmpty)
                      _StatPill(
                        icon: Icons.schedule_outlined,
                        label: j.time,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BudgetRow extends StatelessWidget {
  final String budget;
  const _BudgetRow({required this.budget});

  @override
  Widget build(BuildContext context) {
    final hasBudget = budget.trim().isNotEmpty;
    return Row(
      children: [
        Icon(Icons.payments_outlined,
            size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          hasBudget ? budget : 'Bütçe belirtilmedi',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _PosterCard extends StatelessWidget {
  final JobPoster? poster;
  const _PosterCard({required this.poster});

  @override
  Widget build(BuildContext context) {
    if (poster == null) return const SizedBox.shrink();
    final p = poster!;
    final name = p.fullName.trim().isEmpty ? 'İlan sahibi' : p.fullName;
    final img = p.profileImageUrl;
    final initials = name.isNotEmpty
        ? name.trim().split(RegExp(r'\s+')).first[0].toUpperCase()
        : '?';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.primary.withValues(alpha: 0.18),
            backgroundImage: (img != null && img.isNotEmpty)
                ? CachedNetworkImageProvider(img)
                : null,
            child: (img == null || img.isEmpty)
                ? Text(
                    initials,
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    if (p.identityVerified) ...[
                      const SizedBox(width: 6),
                      Icon(Icons.verified,
                          size: 16, color: AppColors.verifiedBlue),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Skor: ${p.reputationScore}  •  ★ ${p.averageRating.toStringAsFixed(1)}',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MiniChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _StatPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _StickyCta extends StatelessWidget {
  final VoidCallback onOpenFull;
  final VoidCallback onOffer;
  const _StickyCta({required this.onOpenFull, required this.onOffer});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.border),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: onOpenFull,
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text(
                  'Detayı Aç',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: SizedBox(
              height: 52,
              child: OutlinedButton.icon(
                onPressed: onOffer,
                icon: const Icon(Icons.local_offer_outlined, size: 18),
                label: const Text('Teklif Ver'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
