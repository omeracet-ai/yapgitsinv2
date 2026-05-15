import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';
import '../../../core/theme/app_colors.dart';
import '../../photos/data/firebase_photo_repository.dart';
import '../presentation/providers/auth_provider.dart';

/// Phase 152 — Worker tanıtım videosu (60sec cap).
/// Mevcut video varsa preview + Sil; yoksa "🎥 Tanıtım Videosu Ekle".
class IntroVideoSection extends ConsumerStatefulWidget {
  final String? introVideoUrl;
  final int? introVideoDuration;
  const IntroVideoSection({
    super.key,
    required this.introVideoUrl,
    required this.introVideoDuration,
  });

  @override
  ConsumerState<IntroVideoSection> createState() => _IntroVideoSectionState();
}

class _IntroVideoSectionState extends ConsumerState<IntroVideoSection> {
  bool _busy = false;

  Future<void> _pickAndUpload() async {
    if (_busy) return;
    final picker = ImagePicker();
    final picked = await picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(seconds: 60),
    );
    if (picked == null) return;

    // Client-side duration check (image_picker maxDuration trim'ler ama
    // bazı cihazlarda zorlama yok — çift kontrol).
    // dart:io File YASAK — networkUrl ile kontrol yapılamaz; duration check
    // sunucu tarafında yapılır (uploads/intro-video endpoint 65sn reddeder).
    int? durationSeconds;
    if (!kIsWeb) {
      final ctrl = VideoPlayerController.networkUrl(
        Uri.file(picked.path),
      );
      try {
        await ctrl.initialize();
        durationSeconds = ctrl.value.duration.inSeconds;
      } catch (e, st) {
        debugPrint('intro_video_section.pickVideo.initialize: $e\n$st');
      } finally {
        await ctrl.dispose();
      }
    }

    if (durationSeconds != null && durationSeconds > 65) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tanıtım videosu en fazla 60 saniye olabilir'),
        ),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final repo = ref.read(firebasePhotoRepositoryProvider);
      final result = await repo.uploadIntroVideo(picked,
          durationSeconds: durationSeconds);
      if (!mounted) return;
      ref.read(authStateProvider.notifier).updateUserData({
        'introVideoUrl': result['introVideoUrl'],
        'introVideoDuration': result['introVideoDuration'],
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tanıtım videosu yüklendi')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sil'),
        content: const Text('Tanıtım videosu silinsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final repo = ref.read(firebasePhotoRepositoryProvider);
      await repo.removeIntroVideo();
      if (!mounted) return;
      ref.read(authStateProvider.notifier).updateUserData({
        'introVideoUrl': null,
        'introVideoDuration': null,
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.introVideoUrl;
    if (url != null && url.isNotEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IntroVideoPlayer(
            url: url,
            durationSeconds: widget.introVideoDuration,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: _busy ? null : _pickAndUpload,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Değiştir'),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: _delete,
                icon: const Icon(Icons.delete_outline,
                    size: 18, color: AppColors.error),
                label: const Text('Sil',
                    style: TextStyle(color: AppColors.error)),
              ),
            ],
          ),
        ],
      );
    }
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _busy ? null : _pickAndUpload,
        icon: _busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.videocam_outlined),
        label: Text(_busy ? 'Yükleniyor…' : '🎥 Tanıtım Videosu Ekle (max 60sn)'),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}

/// Public profile + edit preview için ortak player. Auto-play OFF, mute default.
class IntroVideoPlayer extends StatefulWidget {
  final String url;
  final int? durationSeconds;
  const IntroVideoPlayer({
    super.key,
    required this.url,
    this.durationSeconds,
  });

  @override
  State<IntroVideoPlayer> createState() => _IntroVideoPlayerState();
}

class _IntroVideoPlayerState extends State<IntroVideoPlayer> {
  late final VideoPlayerController _ctrl;
  bool _ready = false;
  bool _muted = true;

  @override
  void initState() {
    super.initState();
    _ctrl = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..setVolume(0)
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() => _ready = true);
      });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final aspect = _ready && _ctrl.value.aspectRatio > 0
        ? _ctrl.value.aspectRatio
        : 16 / 9;
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: AspectRatio(
        aspectRatio: aspect,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Container(color: Colors.black),
            if (_ready) VideoPlayer(_ctrl),
            if (_ready)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: VideoProgressIndicator(_ctrl, allowScrubbing: true),
              ),
            if (!_ready)
              const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            if (_ready)
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    setState(() {
                      _ctrl.value.isPlaying ? _ctrl.pause() : _ctrl.play();
                    });
                  },
                  child: AnimatedOpacity(
                    opacity: _ctrl.value.isPlaying ? 0 : 1,
                    duration: const Duration(milliseconds: 200),
                    child: Container(
                      color: Colors.black26,
                      child: const Center(
                        child: Icon(Icons.play_circle_fill,
                            color: Colors.white, size: 64),
                      ),
                    ),
                  ),
                ),
              ),
            if (_ready)
              Positioned(
                top: 8,
                right: 8,
                child: Material(
                  color: Colors.black54,
                  shape: const CircleBorder(),
                  child: IconButton(
                    iconSize: 20,
                    icon: Icon(_muted ? Icons.volume_off : Icons.volume_up,
                        color: Colors.white),
                    onPressed: () {
                      setState(() {
                        _muted = !_muted;
                        _ctrl.setVolume(_muted ? 0 : 1);
                      });
                    },
                  ),
                ),
              ),
            if (widget.durationSeconds != null)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${widget.durationSeconds}s',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
