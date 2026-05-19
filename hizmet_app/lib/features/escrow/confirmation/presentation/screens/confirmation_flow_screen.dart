import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../data/escrow_repository.dart';
import '../../data/confirmation_repository.dart';
import '../../data/confirmation_state.dart';
import '../../providers/confirmation_providers.dart';
import '../widgets/confirmation_progress.dart';
import '../widgets/photo_capture_step.dart';
import '../widgets/qr_display_widget.dart';
import '../widgets/qr_scanner_screen.dart';
import '../widgets/video_capture_step.dart';

/// Phase 254 — Ödeme öncesi karşılıklı onay flow ekranı.
///
/// State'e göre tek route'tan farklı step'ler render eder:
///   - Step 0: (worker) Onay sürecini başlat → /start
///   - Step 1: QR display (worker) / QR tara (customer)
///   - Step 2: Foto çek (before + after) — standard+ tier
///   - Step 3: (premium) opsiyonel video
///   - Step 4: "Onaylıyorum" → /confirm
///   - Step 5: Success — escrow released
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
  bool _videoSkipped = false;
  String? _error;

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

  Future<Position?> _getPosition() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        // ignore: deprecated_member_use
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 8));
    } catch (_) {
      return null;
    }
  }

  Future<void> _startProcess() async {
    final pos = await _getPosition();
    if (pos == null) {
      _toast('Konum izni gerekli');
      return;
    }
    try {
      await ref.read(confirmationRepositoryProvider).start(
            escrowId: widget.escrowId,
            lat: pos.latitude,
            lng: pos.longitude,
          );
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _refreshQr() async {
    try {
      await ref
          .read(confirmationRepositoryProvider)
          .getQr(widget.escrowId);
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      // Süresi dolduysa /start tekrar çağrılmalı.
      await _startProcess();
    }
  }

  Future<void> _scanQr() async {
    final scanned = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (scanned == null || scanned.isEmpty) return;
    final pos = await _getPosition();
    if (pos == null) {
      _toast('Konum izni gerekli');
      return;
    }
    try {
      final res = await ref.read(confirmationRepositoryProvider).scan(
            escrowId: widget.escrowId,
            qrToken: scanned,
            lat: pos.latitude,
            lng: pos.longitude,
          );
      if (!res.ok) {
        _toast(res.gpsMatch
            ? 'QR doğrulanamadı'
            : 'Konum eşleşmedi (${res.distanceM?.toStringAsFixed(0)}m uzak)');
        return;
      }
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _confirm() async {
    final ctrl = TextEditingController();
    final signature = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Onayla'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
                'Karşılıklı doğrulama tamamlandı. Onayladığınızda ödeme süreci başlar.'),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              decoration: const InputDecoration(
                labelText: 'Adınız (opsiyonel imza)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(null),
              child: const Text('İptal')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()),
            child: const Text('Onaylıyorum'),
          ),
        ],
      ),
    );
    if (signature == null) return;
    try {
      final res = await ref.read(confirmationRepositoryProvider).confirm(
            escrowId: widget.escrowId,
            signature: signature.isEmpty ? null : signature,
          );
      if (!mounted) return;
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
      if (res.escrowReleased) {
        _toast('✅ Ödeme serbest bırakıldı');
      }
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
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
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ),
      );
    }

    final async = ref.watch(confirmationStateProvider(widget.escrowId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Karşılıklı Onay'),
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
                const Icon(Icons.error_outline,
                    color: AppColors.error, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Yüklenemedi: $e',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.error),
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
        data: (st) => _buildBody(st),
      ),
    );
  }

  Widget _buildBody(ConfirmationState st) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ConfirmationProgress(state: st, mySide: _mySide),
          const SizedBox(height: 16),
          _buildStep(st),
        ],
      ),
    );
  }

  Widget _buildStep(ConfirmationState st) {
    final isWorker = _mySide == ConfirmationSide.worker;
    final isLite = st.tier == ConfirmationTier.lite;
    final isPremium = st.tier == ConfirmationTier.premium;
    final req = st.requirements.photosPerPhase;

    // Step 5: tamamlandı.
    if (st.escrowReleased || st.allConditionsMet && st.workerConfirmed && st.customerConfirmed) {
      return _success();
    }

    // Step 0: süreç başlamamış — sadece worker /start çağırır.
    // qrScannedAt boş ve deadline da boşsa "henüz başlamadı".
    if (!st.qrScanned && st.deadline == null) {
      if (isWorker) {
        return _stepCard(
          icon: Icons.handshake_rounded,
          title: 'Müşteriyle Buluştun mu?',
          subtitle:
              'İşi tamamladıktan sonra ya da yerinde, müşteri ile yan yanayken QR oluştur. '
              'Müşteri QR\'ı taradıktan sonra (gerekiyorsa) fotoğraf çekip onaylayacaksınız.',
          action: ElevatedButton.icon(
            onPressed: _startProcess,
            icon: const Icon(Icons.qr_code_2_rounded),
            label: const Text('QR Oluştur ve Başlat'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );
      } else {
        return _stepCard(
          icon: Icons.hourglass_top_rounded,
          title: 'Usta Onay Sürecini Başlatmadı',
          subtitle:
              'Usta iş tamamlandığında QR oluşturacak. QR çıktığında bu ekranda göreceksiniz.',
        );
      }
    }

    // Step 1: QR aşaması — qrScannedAt yok.
    if (!st.qrScanned) {
      if (isWorker) {
        return _QrStepWorker(
          escrowId: widget.escrowId,
          onRefresh: _refreshQr,
        );
      } else {
        return _stepCard(
          icon: Icons.qr_code_scanner_rounded,
          title: 'Ustanın QR Kodunu Tarat',
          subtitle:
              'Usta yan yanayken QR oluşturdu. Tarayıcıyı aç ve kodu okut. '
              'Konum eşleşmesi de doğrulanır.',
          action: ElevatedButton.icon(
            onPressed: _scanQr,
            icon: const Icon(Icons.qr_code_scanner_rounded),
            label: const Text('QR Tara'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );
      }
    }

    // Lite tier: QR scan sonrası direkt onay.
    if (isLite) {
      return _buildConfirmStep(st);
    }

    // Step 2: Foto adımı.
    final mySidePhotos = isWorker ? st.workerPhotos : st.customerPhotos;
    if (req > 0) {
      if (mySidePhotos.before.length < req) {
        return PhotoCaptureStep(
          escrowId: widget.escrowId,
          phase: ConfirmationPhase.before,
          side: _mySide!,
          requiredCount: req,
          currentCount: mySidePhotos.before.length,
          onUploaded: () => ref
              .read(confirmationStateProvider(widget.escrowId).notifier)
              .refresh(),
        );
      }
      if (mySidePhotos.after.length < req) {
        return PhotoCaptureStep(
          escrowId: widget.escrowId,
          phase: ConfirmationPhase.after,
          side: _mySide!,
          requiredCount: req,
          currentCount: mySidePhotos.after.length,
          onUploaded: () => ref
              .read(confirmationStateProvider(widget.escrowId).notifier)
              .refresh(),
        );
      }
    }

    // Step 3: Premium video (opsiyonel).
    if (isPremium && !_videoSkipped && st.videoUrl == null) {
      return VideoCaptureStep(
        escrowId: widget.escrowId,
        alreadyUploaded: false,
        onUploaded: () {
          ref
              .read(confirmationStateProvider(widget.escrowId).notifier)
              .refresh();
        },
        onSkip: () => setState(() => _videoSkipped = true),
      );
    }

    // Step 4: Onay.
    return _buildConfirmStep(st);
  }

  Widget _buildConfirmStep(ConfirmationState st) {
    final iConfirmed =
        _mySide == 'worker' ? st.workerConfirmed : st.customerConfirmed;
    final otherConfirmed =
        _mySide == 'worker' ? st.customerConfirmed : st.workerConfirmed;

    if (iConfirmed && !otherConfirmed) {
      return _stepCard(
        icon: Icons.hourglass_top_rounded,
        title: 'Karşı Tarafın Onayı Bekleniyor',
        subtitle:
            'Onayınız kaydedildi. Karşı taraf onayladığında ödeme serbest bırakılır.',
      );
    }

    return _stepCard(
      icon: Icons.verified_user_rounded,
      title: 'Onaylıyorum',
      subtitle: 'Karşılıklı doğrulama tamamlandı. Onaylayarak ödemenin '
          'serbest bırakılmasını başlatıyorsunuz.',
      action: ElevatedButton.icon(
        onPressed: iConfirmed ? null : _confirm,
        icon: const Icon(Icons.check_circle_outline),
        label: Text(iConfirmed ? 'Onaylandı' : 'Onaylıyorum'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF00C9A7),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  Widget _success() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFE3F8EE),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_rounded,
              color: AppColors.success, size: 64),
          const SizedBox(height: 12),
          const Text(
            'Ödeme Serbest Bırakıldı',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 8),
          const Text(
            'Karşılıklı onay tamamlandı. Ödeme ustanın hesabına aktarıldı.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 16),
          if (_mySide == ConfirmationSide.worker)
            ElevatedButton.icon(
              onPressed: () => context.go('/kazanclarim'),
              icon: const Icon(Icons.payments_rounded),
              label: const Text('Kazançlarımı Gör'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
              ),
            )
          else
            ElevatedButton.icon(
              onPressed: () => context.go('/escrow-listesi'),
              icon: const Icon(Icons.list_alt_rounded),
              label: const Text('Escrow Listem'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
              ),
            ),
        ],
      ),
    );
  }

  Widget _stepCard({
    required IconData icon,
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
            Icon(icon, color: AppColors.primary, size: 26),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          Text(subtitle, style: const TextStyle(fontSize: 13.5, height: 1.4)),
          if (action != null) ...[
            const SizedBox(height: 16),
            action,
          ],
        ],
      ),
    );
  }
}

/// Worker QR step — backend'den qrToken+expiresAt çeker ve display widget'ı sarar.
class _QrStepWorker extends ConsumerStatefulWidget {
  final String escrowId;
  final Future<void> Function() onRefresh;
  const _QrStepWorker({required this.escrowId, required this.onRefresh});

  @override
  ConsumerState<_QrStepWorker> createState() => _QrStepWorkerState();
}

class _QrStepWorkerState extends ConsumerState<_QrStepWorker> {
  QrToken? _qr;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final qr = await ref
          .read(confirmationRepositoryProvider)
          .getQr(widget.escrowId);
      if (!mounted) return;
      setState(() {
        _qr = qr;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _qr == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            const Icon(Icons.error_outline,
                color: AppColors.error, size: 36),
            const SizedBox(height: 8),
            Text(_error ?? 'QR yüklenemedi',
                style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () async {
                await widget.onRefresh();
                _load();
              },
              child: const Text('Yeniden Dene'),
            ),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Text(
            'Müşterinin QR\'ı Taramasını Bekliyoruz',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 12),
          QrDisplayWidget(
            qrToken: _qr!.qrToken,
            expiresAt: _qr!.expiresAt,
            onRefresh: () async {
              await widget.onRefresh();
              await _load();
            },
          ),
        ],
      ),
    );
  }
}
