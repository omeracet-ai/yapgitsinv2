import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../data/confirmation_repository.dart';

/// Phase 254 — Premium tier opsiyonel video kayıt (max 60sn).
/// camera paketinin tam kontrolü yerine image_picker.pickVideo ile native
/// kamera UI kullanıyoruz — kullanıcının önceden bildiği akış.
class VideoCaptureStep extends ConsumerStatefulWidget {
  final String escrowId;
  final bool alreadyUploaded;
  final VoidCallback onUploaded;
  final VoidCallback onSkip;

  const VideoCaptureStep({
    super.key,
    required this.escrowId,
    required this.alreadyUploaded,
    required this.onUploaded,
    required this.onSkip,
  });

  @override
  ConsumerState<VideoCaptureStep> createState() => _VideoCaptureStepState();
}

class _VideoCaptureStepState extends ConsumerState<VideoCaptureStep> {
  bool _busy = false;
  String? _error;

  Future<void> _record() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final picker = ImagePicker();
      final xfile = await picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(seconds: 60),
      );
      if (xfile == null) {
        setState(() => _busy = false);
        return;
      }
      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          // ignore: deprecated_member_use
          desiredAccuracy: LocationAccuracy.high,
        ).timeout(const Duration(seconds: 8));
      } catch (_) {}
      await ref.read(confirmationRepositoryProvider).uploadVideo(
            escrowId: widget.escrowId,
            file: xfile,
            lat: pos?.latitude ?? 0,
            lng: pos?.longitude ?? 0,
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
          Row(children: [
            const Icon(Icons.videocam_rounded, color: AppColors.primary),
            const SizedBox(width: 8),
            const Text(
              'Opsiyonel: 60sn video',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            const Spacer(),
            if (widget.alreadyUploaded)
              const Icon(Icons.check_circle, color: AppColors.success),
          ]),
          const SizedBox(height: 10),
          const Text(
            'Premium işlerde video kaydı uyuşmazlık durumunda ekstra kanıt sağlar.',
            style: TextStyle(fontSize: 13),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!,
                style: const TextStyle(color: AppColors.error, fontSize: 12)),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : widget.onSkip,
                  child: const Text('Atla'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed:
                      (_busy || widget.alreadyUploaded) ? null : _record,
                  icon: const Icon(Icons.fiber_manual_record_rounded),
                  label: Text(_busy ? 'Yükleniyor…' : 'Video Kaydet'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
