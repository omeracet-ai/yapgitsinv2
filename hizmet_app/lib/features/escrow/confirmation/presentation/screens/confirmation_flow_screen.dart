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

/// Phase 254 / v2 — Ödeme öncesi karşılıklı onay flow ekranı.
///
/// v2 sırası (foto → onay → QR/ödeme):
///   - Step 0: (worker) Onay sürecini başlat → /start
///   - Step 1: Foto çek (before + after) — her iki taraf
///   - Step 2: "Onayla" → /approve (release tetiklemez)
///   - Step 3: QR & Ödeme — her iki taraf onayladıktan sonra:
///       • customer (payer) → QR oluşturur (/qr)
///       • worker → QR'ı okutur (/scan) → ödeme serbest bırakılır
///   - Step 4: Success — escrow released
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

  /// QR ödeme onay akışında video adımı gizlendi (restorable: true yap).
  /// Kod ve VideoCaptureStep korundu; akış foto sonrası direkt onaya geçer.
  final bool _escrowVideoEnabled = false;

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

  /// Customer (payer) QR oluşturur — GPS ile birlikte gönderir.
  Future<void> _refreshQr() async {
    final pos = await _getPosition();
    try {
      await ref.read(confirmationRepositoryProvider).getQr(
            widget.escrowId,
            lat: pos?.latitude,
            lng: pos?.longitude,
          );
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
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
      // v2: geçerli scan ödemeyi serbest bırakır.
      _toast('✅ QR doğrulandı, ödeme serbest bırakıldı');
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  /// v2: kendi onayını gönder (release tetiklemez). Her iki taraf onaylayınca
  /// QR & ödeme adımı açılır.
  Future<void> _confirm() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Onayla'),
        content: const Text(
            'İşi onaylıyorsunuz. Onayladığınızda karşı tarafın onayı '
            'beklenir; her iki taraf onaylayınca QR ile ödeme adımı açılır.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('İptal')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(confirmationRepositoryProvider)
          .approve(widget.escrowId);
      if (!mounted) return;
      _toast('✅ Onayınız kaydedildi');
      ref
          .read(confirmationStateProvider(widget.escrowId).notifier)
          .refresh();
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
    final isPremium = st.tier == ConfirmationTier.premium;
    final req = st.requirements.photosPerPhase;

    // Son adım: tamamlandı (ödeme serbest bırakıldı).
    if (st.escrowReleased) {
      return _success();
    }

    // Step 0: süreç başlamamış — sadece worker /start çağırır.
    // qrScannedAt boş ve deadline da boşsa "henüz başlamadı".
    if (!st.qrScanned && st.deadline == null) {
      if (isWorker) {
        return _stepCard(
          icon: Icons.handshake_rounded,
          title: 'Onay Sürecini Başlat',
          subtitle:
              'İşi tamamladıktan sonra onay sürecini başlat. Ardından her iki '
              'taraf onaylayacak; en son müşteri QR oluşturup sen okutacaksın.',
          action: ElevatedButton.icon(
            onPressed: _startProcess,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Onay Sürecini Başlat'),
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
              'Usta iş tamamlandığında onay sürecini başlatacak. Ardından '
              'onay adımını burada göreceksiniz.',
        );
      }
    }

    final bothApproved = st.workerConfirmed && st.customerConfirmed;

    // Her iki taraf onaylamadıysa: önce foto, sonra onay.
    if (!bothApproved) {
      // Step 1: Foto adımı (önce + sonra, her iki taraf).
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

      // (Opsiyonel) Premium video — gizlendi (_escrowVideoEnabled=false).
      if (_escrowVideoEnabled &&
          isPremium &&
          !_videoSkipped &&
          st.videoUrl == null) {
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

      // Step 2: Onayla (/approve) — release tetiklemez.
      return _buildApproveStep(st);
    }

    // Step 3: QR & Ödeme — her iki taraf onayladı.
    //   customer (payer) → QR oluşturur; worker → QR'ı okutur (release).
    if (isWorker) {
      return _stepCard(
        icon: Icons.qr_code_scanner_rounded,
        title: 'Müşterinin QR Kodunu Okut',
        subtitle:
            'Müşteri ödeme QR\'ını oluşturdu. Yan yanayken kodu okut; konum '
            'eşleşmesi doğrulanınca ödeme serbest bırakılır.',
        action: ElevatedButton.icon(
          onPressed: _scanQr,
          icon: const Icon(Icons.qr_code_scanner_rounded),
          label: const Text('QR Okut'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      );
    }
    return _QrStepCustomer(
      escrowId: widget.escrowId,
      onRefresh: _refreshQr,
    );
  }

  /// v2 onay adımı (/approve). QR'a bağlı DEĞİL; foto sonrası gelir.
  Widget _buildApproveStep(ConfirmationState st) {
    final iConfirmed =
        _mySide == 'worker' ? st.workerConfirmed : st.customerConfirmed;
    final otherConfirmed =
        _mySide == 'worker' ? st.customerConfirmed : st.workerConfirmed;

    if (iConfirmed && !otherConfirmed) {
      return _stepCard(
        icon: Icons.hourglass_top_rounded,
        title: 'Karşı Tarafın Onayı Bekleniyor',
        subtitle:
            'Onayınız kaydedildi. Karşı taraf da onayladığında QR ile ödeme '
            'adımı açılacak.',
      );
    }

    return _stepCard(
      icon: Icons.verified_user_rounded,
      title: 'Onayla',
      subtitle: 'İşi onaylayın; her iki taraf onayladıktan sonra QR ile '
          'ödeme adımı açılır.',
      action: ElevatedButton.icon(
        onPressed: iConfirmed ? null : _confirm,
        icon: const Icon(Icons.check_circle_outline),
        label: Text(iConfirmed ? 'Onaylandı' : 'Onayla'),
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
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppColors.secondary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Karşılıklı onay tamamlandı. Ödeme ustanın hesabına aktarıldı.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.black54),
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

/// Customer (payer) QR step — backend'den qrToken+expiresAt çeker ve display
/// widget'ı sarar. v2'de QR'ı ödeyen taraf (müşteri) oluşturur; usta okutur.
class _QrStepCustomer extends ConsumerStatefulWidget {
  final String escrowId;
  final Future<void> Function() onRefresh;
  const _QrStepCustomer({required this.escrowId, required this.onRefresh});

  @override
  ConsumerState<_QrStepCustomer> createState() => _QrStepCustomerState();
}

class _QrStepCustomerState extends ConsumerState<_QrStepCustomer> {
  QrToken? _qr;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<Position?> _position() async {
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

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Payer QR'ı kendi konumuyla oluşturur (worker scan'inde GPS eşleşmesi için).
      final pos = await _position();
      final qr = await ref.read(confirmationRepositoryProvider).getQr(
            widget.escrowId,
            lat: pos?.latitude,
            lng: pos?.longitude,
          );
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
            'Ödeme QR\'ı — Ustanın Okutmasını Bekliyoruz',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 6),
          Text(
            'Yan yanayken bu kodu ustaya okutun. Usta okuttuğunda ödeme '
            'serbest bırakılır.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
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
