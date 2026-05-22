import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../data/confirmation_repository.dart';
import '../../data/confirmation_state.dart';

/// Phase 254 — Foto çekim adımı (before veya after).
/// Standard+ tier için her taraf 1 foto before + 1 foto after çeker.
class PhotoCaptureStep extends ConsumerStatefulWidget {
  final String escrowId;
  final String phase; // before | after
  final String side; // worker | customer (UI label için, backend kendisi karar verir)
  final int requiredCount;
  final int currentCount;
  final VoidCallback onUploaded;

  const PhotoCaptureStep({
    super.key,
    required this.escrowId,
    required this.phase,
    required this.side,
    required this.requiredCount,
    required this.currentCount,
    required this.onUploaded,
  });

  @override
  ConsumerState<PhotoCaptureStep> createState() => _PhotoCaptureStepState();
}

class _PhotoCaptureStepState extends ConsumerState<PhotoCaptureStep> {
  bool _busy = false;
  String? _error;

  Future<void> _capture() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      if (xfile == null) {
        setState(() => _busy = false);
        return;
      }
      // GPS — izin yoksa 0,0 gönderme, kullanıcıyı uyar.
      Position? pos;
      try {
        final perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.denied) {
          await Geolocator.requestPermission();
        }
        pos = await Geolocator.getCurrentPosition(
          // ignore: deprecated_member_use
          desiredAccuracy: LocationAccuracy.high,
        ).timeout(const Duration(seconds: 8));
      } catch (_) {
        pos = null;
      }
      if (pos == null) {
        setState(() {
          _error = 'Konum alınamadı. Konum izni gerekli.';
          _busy = false;
        });
        return;
      }
      await ref.read(confirmationRepositoryProvider).uploadPhoto(
            escrowId: widget.escrowId,
            file: xfile,
            phase: widget.phase,
            lat: pos.latitude,
            lng: pos.longitude,
            takenAt: DateTime.now(),
          );
      if (!mounted) return;
      widget.onUploaded();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phaseLabel =
        widget.phase == ConfirmationPhase.before ? 'ÖNCE' : 'SONRA';
    final done = widget.currentCount >= widget.requiredCount;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: done
                      ? const Color(0xFFE3F8EE)
                      : const Color(0xFFFFF4E0),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  phaseLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: done ? AppColors.success : AppColors.warning,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${widget.currentCount}/${widget.requiredCount} fotoğraf',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
              if (done) ...[
                const Spacer(),
                const Icon(Icons.check_circle, color: AppColors.success),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.phase == ConfirmationPhase.before
                ? 'İş başlamadan önce alanın fotoğrafını çekin.'
                : 'İş tamamlandıktan sonra alanın fotoğrafını çekin.',
            style: const TextStyle(fontSize: 14),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                style: const TextStyle(color: AppColors.error, fontSize: 12)),
          ],
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: (_busy || done) ? null : _capture,
            icon: const Icon(Icons.camera_alt_rounded),
            label: Text(_busy
                ? 'Yükleniyor…'
                : done
                    ? 'Tamamlandı'
                    : 'Fotoğraf Çek'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}
