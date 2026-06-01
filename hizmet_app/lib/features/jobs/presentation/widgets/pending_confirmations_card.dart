import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../escrow/confirmation/data/confirmation_repository.dart';
import '../../../escrow/confirmation/data/pending_confirmation.dart';

/// Phase 271 — "Onay Bekleyen İşler" list shown on top of İşlerim.
///
/// - `awaiting_confirmation` + !myConfirmed → "✓ Onayla" button (confirm-plain).
/// - `awaiting_confirmation` +  myConfirmed → grey "Karşı taraf bekleniyor".
/// - `pending_grace`                       → countdown + "Hemen Tamamla" + "İptal".
final pendingConfirmationsProvider =
    FutureProvider.autoDispose<List<PendingConfirmation>>((ref) async {
  return ref.read(confirmationRepositoryProvider).listMyPending();
});

class PendingConfirmationsCard extends ConsumerWidget {
  const PendingConfirmationsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncList = ref.watch(pendingConfirmationsProvider);

    return asyncList.when(
      // Loading/error stays silent — this is an additive top-section, not a
      // gate. The main tab bar should still be usable even if this fails.
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return _Card(items: items);
      },
    );
  }
}

class _Card extends StatelessWidget {
  final List<PendingConfirmation> items;
  const _Card({required this.items});

  @override
  Widget build(BuildContext context) {
    final hasGrace = items.any((e) => e.isPendingGrace);
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasGrace
              ? AppColors.warning.withValues(alpha: 0.55)
              : AppColors.border,
          width: hasGrace ? 1.4 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: (hasGrace ? AppColors.warning : Colors.black)
                .withValues(alpha: hasGrace ? 0.10 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
            child: Row(
              children: [
                const Text('⏳ ',
                    style: TextStyle(fontSize: 16)),
                Expanded(
                  child: Text(
                    'Onay Bekleyen İşler (${items.length})',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          ...items.map((it) => _Row(item: it)),
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

class _Row extends ConsumerStatefulWidget {
  final PendingConfirmation item;
  const _Row({required this.item});

  @override
  ConsumerState<_Row> createState() => _RowState();
}

class _RowState extends ConsumerState<_Row> {
  bool _busy = false;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    if (widget.item.isPendingGrace && widget.item.graceEndsAt != null) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() op, String successMsg) async {
    setState(() => _busy = true);
    try {
      await op();
      if (!mounted) return;
      ref.invalidate(pendingConfirmationsProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text(successMsg),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(e.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _confirm() {
    final repo = ref.read(confirmationRepositoryProvider);
    _run(
      () => repo
          .confirmPlain(
            escrowId: widget.item.escrowId,
            side: widget.item.mySide,
          )
          .then((_) {}),
      'Onayın gönderildi.',
    );
  }

  void _finalize() {
    final repo = ref.read(confirmationRepositoryProvider);
    _run(
      () =>
          repo.finalizeGraceEarly(escrowId: widget.item.escrowId).then((_) {}),
      'Hizmet tamamlandı.',
    );
  }

  void _cancel() {
    final repo = ref.read(confirmationRepositoryProvider);
    _run(
      () => repo.cancelGrace(escrowId: widget.item.escrowId).then((_) {}),
      'İptal edildi.',
    );
  }

  String _countdown() {
    final end = widget.item.graceEndsAt;
    if (end == null) return '';
    final remain = end.difference(DateTime.now());
    if (remain.isNegative) return '0:00';
    final h = remain.inHours;
    final m = remain.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = remain.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final it = widget.item;
    final amountStr = '${it.amount.toStringAsFixed(0)} ₺';

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.border,
              backgroundImage: (it.counterpartyImage != null &&
                      it.counterpartyImage!.isNotEmpty)
                  ? NetworkImage(it.counterpartyImage!)
                  : null,
              child: (it.counterpartyImage == null ||
                      it.counterpartyImage!.isEmpty)
                  ? Text(
                      it.counterpartyName.isNotEmpty
                          ? it.counterpartyName.characters.first.toUpperCase()
                          : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    it.jobTitle ?? 'İş',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        amountStr,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          it.counterpartyName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (it.isPendingGrace) ...[
                    const SizedBox(height: 3),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.hourglass_bottom_rounded,
                            size: 12, color: AppColors.warning),
                        const SizedBox(width: 3),
                        Text(
                          _countdown(),
                          style: const TextStyle(
                            color: AppColors.warning,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            fontFeatures: [
                              FontFeature.tabularFigures(),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            _actions(),
          ],
        ),
      ),
    );
  }

  Widget _actions() {
    final it = widget.item;
    if (_busy) {
      return const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    if (it.isPendingGrace) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 28,
            child: ElevatedButton(
              onPressed: _finalize,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: const Text('Hemen Tamamla'),
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 24,
            child: OutlinedButton(
              onPressed: _cancel,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.6)),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
              child: const Text('İptal'),
            ),
          ),
        ],
      );
    }
    // awaiting_confirmation
    if (it.myConfirmed) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.border,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          'Karşı taraf bekleniyor',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
    return SizedBox(
      height: 30,
      child: ElevatedButton.icon(
        onPressed: _confirm,
        icon: const Icon(Icons.check_circle_outline, size: 14),
        label: const Text('Onayla'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.success,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          textStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
