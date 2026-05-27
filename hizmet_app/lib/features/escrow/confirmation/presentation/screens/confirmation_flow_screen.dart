import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../data/escrow_repository.dart';
import '../../data/confirmation_repository.dart';
import '../../data/confirmation_state.dart';
import '../../providers/confirmation_providers.dart';
// NOTE (Phase 267): QR display/scanner widgets retained on disk for backward
// compat but no longer wired into the flow. The flag below restores them.
// ignore: unused_import
import '../widgets/qr_display_widget.dart';
// ignore: unused_import
import '../widgets/qr_scanner_screen.dart';

/// Phase 267 — Plain-confirm flow with 1hr grace window.
///
/// Akış:
///   - Step 0: Her iki taraf "Onayla" butonuna basar (plain, GPS+QR yok).
///   - Step 1: Her iki taraf onayladığında PENDING_GRACE — 1 saatlik countdown
///     başlar. Bu süre içinde her iki taraf "İptal Et" basabilir.
///   - Step 2: Grace bittiğinde sunucu cron'u COMPLETED'a flipler + ödeme
///     serbest bırakılır.
class ConfirmationFlowScreen extends ConsumerStatefulWidget {
  final String escrowId;

  const ConfirmationFlowScreen({super.key, required this.escrowId});

  @override
  ConsumerState<ConfirmationFlowScreen> createState() =>
      _ConfirmationFlowScreenState();
}

class _ConfirmationFlowScreenState
    extends ConsumerState<ConfirmationFlowScreen> {
  String? _mySide; // worker | customer
  bool _resolving = true;
  String? _error;
  bool _submitting = false;

  /// Phase 267 — QR akışını gizleyen feature flag. true yapılırsa eski
  /// QR display + scanner butonları geri gelir. Şu an plain-confirm aktif.
  // ignore: unused_field
  static const bool kEnableQrFlow = false;

  @override
  void initState() {
    super.initState();
    _resolveSide();
  }

  /// Current user'ın bu escrow'daki tarafını /escrow/my listesinden çıkar.
  Future<void> _resolveSide() async {
    try {
      final auth = ref.read(authStateProvider);
      String? uid;
      if (auth is AuthAuthenticated) {
        uid = (auth.user['id'] ?? auth.user['uid'])?.toString();
      }
      if (uid == null) {
        setState(() {
          _error = 'Giriş gerekli.';
          _resolving = false;
        });
        return;
      }
      final list = await ref.read(escrowRepositoryProvider).listMy();
      final match = list.firstWhere(
        (e) => e['id']?.toString() == widget.escrowId,
        orElse: () => const <String, dynamic>{},
      );
      if (match.isEmpty) {
        setState(() {
          _error = 'Escrow bulunamadı.';
          _resolving = false;
        });
        return;
      }
      final side = ConfirmationSideResolver.resolve(
        currentUserId: uid,
        workerId: match['workerId']?.toString(),
        customerId: match['customerId']?.toString(),
      );
      setState(() {
        _mySide = side;
        _resolving = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Yüklenemedi: $e';
        _resolving = false;
      });
    }
  }

  /// Plain confirm — QR/GPS yok, sadece auth.
  Future<void> _confirmPlain() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Onayla'),
        content: const Text(
          'Hizmetin tamamlandığını onaylıyorsunuz. Her iki taraf onayladıktan '
          'sonra 1 saatlik bekleme süreci başlar; bu süre içinde iptal '
          'edebilirsiniz.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _submitting = true);
    try {
      await ref.read(confirmationRepositoryProvider).confirmPlain(
            escrowId: widget.escrowId,
            side: _mySide!,
          );
      if (!mounted) return;
      _toast('Onayınız kaydedildi');
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Grace içinde iptal.
  Future<void> _cancelGrace() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Onayı İptal Et'),
        content: const Text(
          'Hizmet onayını iptal etmek üzeresiniz. Bu işlem geri alınamaz; '
          'onay süreci sıfırdan başlatılması gerekir.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Vazgeç'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('İptal Et'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _submitting = true);
    try {
      await ref.read(confirmationRepositoryProvider).cancelGrace(
            escrowId: widget.escrowId,
          );
      if (!mounted) return;
      _toast('Onay iptal edildi');
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Grace içinde hemen tamamla (1 saat bekleme atlanır).
  Future<void> _finalizeGraceEarly() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hemen Tamamla'),
        content: const Text(
          'Bu işlemi şimdi tamamlamak istediğine emin misin? '
          'Karşı taraf onayı verdiği için anında kapanacak ve ödeme '
          'serbest bırakılacak.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Vazgeç'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Hemen Tamamla'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _submitting = true);
    try {
      await ref.read(confirmationRepositoryProvider).finalizeGraceEarly(
            escrowId: widget.escrowId,
          );
      if (!mounted) return;
      _toast('Hizmet tamamlandı');
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    if (_resolving) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _mySide == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Onay')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text(
              _error ?? 'Bu işlem için yetkili değilsiniz.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ),
      );
    }

    final async = ref.watch(confirmationStateProvider(widget.escrowId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hizmet Onayı'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
      ),
      backgroundColor: AppColors.background,
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, color: AppColors.error, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Yüklenemedi: $e',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.error),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref
                      .read(confirmationStateProvider(widget.escrowId)
                          .notifier)
                      .refresh(),
                  child: const Text('Tekrar Dene'),
                ),
              ],
            ),
          ),
        ),
        data: (st) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [_buildStep(st)],
          ),
        ),
      ),
    );
  }

  Widget _buildStep(ConfirmationState st) {
    // Tamamlandı.
    if (st.isCompleted) return _completedCard();
    // Süresi doldu.
    if (st.isExpired) return _expiredCard();
    // İptal edildi.
    if (st.isCancelled) return _cancelledCard();
    // Grace içinde — countdown + iptal butonu.
    if (st.isPendingGrace) return _GraceCountdownCard(
          graceEndsAt: st.graceEndsAt,
          onCancel: _submitting ? null : _cancelGrace,
          onFinalize: _submitting ? null : _finalizeGraceEarly,
        );
    // Default: plain-confirm butonu (kendi tarafın onaylamadıysa).
    return _confirmCard(st);
  }

  Widget _confirmCard(ConfirmationState st) {
    final isWorker = _mySide == ConfirmationSide.worker;
    final iConfirmed =
        isWorker ? st.workerConfirmed : st.customerConfirmed;
    final otherConfirmed =
        isWorker ? st.customerConfirmed : st.workerConfirmed;

    final title = isWorker
        ? 'Hizmeti Tamamladım'
        : 'Hizmetin Tamamlandığını Onayla';
    final buttonLabel = isWorker
        ? 'Hizmeti Tamamladım Onayla'
        : 'Hizmetin Tamamlandığını Onayla';
    final subtitle = iConfirmed
        ? 'Onayınız kaydedildi. Karşı tarafın onayı bekleniyor.'
        : (otherConfirmed
            ? 'Karşı taraf onayladı. Sizin de onayınızla 1 saatlik bekleme süreci başlar.'
            : 'Hizmetin tamamlandığını onaylayın. Her iki taraf onayladıktan '
                'sonra 1 saatlik bekleme süreci başlar.');

    return _baseCard(
      icon: iConfirmed
          ? Icons.hourglass_top_rounded
          : Icons.check_circle_outline,
      iconColor: iConfirmed ? AppColors.warning : AppColors.success,
      title: iConfirmed ? 'Karşı Tarafın Onayı Bekleniyor' : title,
      subtitle: subtitle,
      action: iConfirmed
          ? null
          : SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _confirmPlain,
                icon: const Icon(Icons.verified_rounded),
                label: Text(buttonLabel),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _completedCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
      ),
      child: Column(
        children: [
          Icon(Icons.check_circle_rounded,
              color: AppColors.success, size: 64),
          const SizedBox(height: 12),
          Text(
            'Hizmet Tamamlandı',
            style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 18,
                color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'Onay süreci tamamlandı. Ödeme ustanın hesabına aktarıldı.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (_mySide == ConfirmationSide.worker)
            ElevatedButton.icon(
              onPressed: () => context.go('/kazanclarim'),
              icon: const Icon(Icons.payments_rounded),
              label: const Text('Kazançlarımı Gör'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            )
          else
            ElevatedButton.icon(
              onPressed: () => context.go('/escrow-listesi'),
              icon: const Icon(Icons.list_alt_rounded),
              label: const Text('Escrow Listem'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
        ],
      ),
    );
  }

  Widget _cancelledCard() {
    return _baseCard(
      icon: Icons.cancel_outlined,
      iconColor: AppColors.textHint,
      title: 'İptal Edildi',
      subtitle: 'Onay süreci iptal edildi. Yeni bir onay başlatılabilir.',
    );
  }

  Widget _expiredCard() {
    return _baseCard(
      icon: Icons.timer_off_rounded,
      iconColor: AppColors.error,
      title: 'Zaman Aşımı',
      subtitle:
          'Onay süresi doldu. Destek ekibimizle iletişime geçin; durum '
          'incelenecek.',
    );
  }

  Widget _baseCard({
    required IconData icon,
    Color? iconColor,
    required String title,
    required String subtitle,
    Widget? action,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Icon(icon, color: iconColor ?? AppColors.primary, size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppColors.textPrimary),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          Text(subtitle,
              style: TextStyle(
                  fontSize: 13.5,
                  height: 1.4,
                  color: AppColors.textSecondary)),
          if (action != null) ...[
            const SizedBox(height: 16),
            action,
          ],
        ],
      ),
    );
  }
}

/// Phase 267 — 1 saatlik grace countdown banner. Her iki taraf "İptal Et"
/// basabilir; grace bittiğinde sunucu cron'u COMPLETED'a flipler.
class _GraceCountdownCard extends StatefulWidget {
  final DateTime? graceEndsAt;
  final VoidCallback? onCancel;
  final VoidCallback? onFinalize;

  const _GraceCountdownCard({
    required this.graceEndsAt,
    required this.onCancel,
    required this.onFinalize,
  });

  @override
  State<_GraceCountdownCard> createState() => _GraceCountdownCardState();
}

class _GraceCountdownCardState extends State<_GraceCountdownCard> {
  Timer? _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    if (widget.graceEndsAt == null) return;
    final diff = widget.graceEndsAt!.difference(DateTime.now());
    setState(() {
      _remaining = diff.isNegative ? Duration.zero : diff;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _fmt(Duration d) {
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    final hh = d.inHours.toString().padLeft(2, '0');
    return '$hh:$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.success.withValues(alpha: 0.4),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle_rounded,
                  color: AppColors.success, size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Onay Tamamlandı',
                  style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: AppColors.textPrimary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Bir saatlik onay süreci bekleme uyarısı. Bu süre içinde '
            'iptal edebilirsiniz; süre sonunda hizmet otomatik tamamlanır.',
            style: TextStyle(
                fontSize: 13.5, height: 1.4, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                Text('KALAN SÜRE',
                    style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                Text(
                  _fmt(_remaining),
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      fontFeatures: const [FontFeature.tabularFigures()]),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: widget.onFinalize,
            icon: const Icon(Icons.check_circle_rounded),
            label: const Text('Hemen Tamamla'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: widget.onCancel,
            icon: const Icon(Icons.close_rounded),
            label: const Text('İptal Et'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: BorderSide(color: AppColors.error.withValues(alpha: 0.6)),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
