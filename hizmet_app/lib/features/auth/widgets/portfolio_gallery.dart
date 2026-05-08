import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';
import '../../../core/theme/app_colors.dart';
import '../../photos/data/photo_repository.dart';
import '../presentation/screens/public_profile_screen.dart';

/// Worker portfolio galerisi (Phase 43 fotoğraf + Phase 125 video).
/// - Sahibi ise üstte "+ Fotoğraf" ve "🎥 Video" butonları, her item'da X.
/// - Fotoğraf tap → lightbox; video tap → fullscreen player.
class PortfolioGallery extends ConsumerStatefulWidget {
  final List<String> photos;
  final List<String> videos;
  final bool isOwner;
  final String userId;
  const PortfolioGallery({
    super.key,
    required this.photos,
    this.videos = const [],
    required this.isOwner,
    required this.userId,
  });

  @override
  ConsumerState<PortfolioGallery> createState() => _PortfolioGalleryState();
}

class _PortfolioGalleryState extends ConsumerState<PortfolioGallery> {
  bool _busy = false;
  bool _busyVideo = false;

  Future<void> _addPhoto() async {
    if (_busy) return;
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (picked == null) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(photoRepositoryProvider);
      await repo.uploadPortfolioPhoto(File(picked.path));
      if (!mounted) return;
      ref.invalidate(publicProfileProvider(widget.userId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fotoğraf eklendi')),
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

  Future<void> _addVideo() async {
    if (_busyVideo) return;
    if (widget.videos.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('En fazla 3 portfolyo videosu ekleyebilirsiniz')),
      );
      return;
    }
    final picker = ImagePicker();
    final picked = await picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(minutes: 2),
    );
    if (picked == null) return;
    setState(() => _busyVideo = true);
    try {
      final repo = ref.read(photoRepositoryProvider);
      await repo.uploadPortfolioVideo(File(picked.path));
      if (!mounted) return;
      ref.invalidate(publicProfileProvider(widget.userId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Video eklendi')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _busyVideo = false);
    }
  }

  Future<void> _removePhoto(String url) async {
    final ok = await _confirm('Bu fotoğraf portfolyodan kaldırılsın mı?');
    if (ok != true) return;
    try {
      final repo = ref.read(photoRepositoryProvider);
      await repo.removePortfolioPhoto(url);
      if (!mounted) return;
      ref.invalidate(publicProfileProvider(widget.userId));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<void> _removeVideo(String url) async {
    final ok = await _confirm('Bu video portfolyodan kaldırılsın mı?');
    if (ok != true) return;
    try {
      final repo = ref.read(photoRepositoryProvider);
      await repo.removePortfolioVideo(url);
      if (!mounted) return;
      ref.invalidate(publicProfileProvider(widget.userId));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<bool?> _confirm(String msg) {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sil'),
        content: Text(msg),
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
  }

  void _openLightbox(int index) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => _Lightbox(photos: widget.photos, initialIndex: index),
    );
  }

  void _openVideoPlayer(String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black,
      builder: (_) => _FullscreenVideoPlayer(url: url),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.photos.isEmpty &&
        widget.videos.isEmpty &&
        !widget.isOwner) {
      return const SizedBox.shrink();
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (widget.isOwner) _addTile(_addPhoto, _busy, Icons.add_a_photo_outlined, 'Foto'),
        if (widget.isOwner)
          _addTile(_addVideo, _busyVideo, Icons.videocam_outlined, 'Video'),
        ...List.generate(widget.photos.length, (i) {
          final url = widget.photos[i];
          return _photoTile(url, i);
        }),
        ...List.generate(widget.videos.length, (i) {
          final url = widget.videos[i];
          return _videoTile(url);
        }),
      ],
    );
  }

  Widget _addTile(VoidCallback onTap, bool busy, IconData icon, String label) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        height: 90,
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.4),
          ),
        ),
        child: busy
            ? const Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, color: AppColors.primary, size: 22),
                  const SizedBox(height: 4),
                  Text(label,
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600)),
                ],
              ),
      ),
    );
  }

  Widget _photoTile(String url, int i) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: () => _openLightbox(i),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              url,
              width: 90,
              height: 90,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 90,
                height: 90,
                color: Colors.grey.shade200,
                child: const Icon(Icons.broken_image_outlined,
                    color: Colors.grey),
              ),
            ),
          ),
        ),
        if (widget.isOwner) _removeBadge(() => _removePhoto(url)),
      ],
    );
  }

  Widget _videoTile(String url) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: () => _openVideoPlayer(url),
          child: Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Icon(Icons.play_circle_fill,
                  color: Colors.white, size: 36),
            ),
          ),
        ),
        Positioned(
          bottom: 4,
          left: 4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text('VIDEO',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold)),
          ),
        ),
        if (widget.isOwner) _removeBadge(() => _removeVideo(url)),
      ],
    );
  }

  Widget _removeBadge(VoidCallback onTap) {
    return Positioned(
      top: -6,
      right: -6,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: AppColors.error,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: const Icon(Icons.close, color: Colors.white, size: 14),
        ),
      ),
    );
  }
}

class _Lightbox extends StatefulWidget {
  final List<String> photos;
  final int initialIndex;
  const _Lightbox({required this.photos, required this.initialIndex});

  @override
  State<_Lightbox> createState() => _LightboxState();
}

class _LightboxState extends State<_Lightbox> {
  late final PageController _ctrl =
      PageController(initialPage: widget.initialIndex);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.zero,
      child: Stack(
        children: [
          PageView.builder(
            controller: _ctrl,
            itemCount: widget.photos.length,
            itemBuilder: (_, i) => InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              child: Center(
                child: Image.network(widget.photos[i], fit: BoxFit.contain),
              ),
            ),
          ),
          Positioned(
            top: 32,
            right: 16,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 28),
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _FullscreenVideoPlayer extends StatefulWidget {
  final String url;
  const _FullscreenVideoPlayer({required this.url});

  @override
  State<_FullscreenVideoPlayer> createState() => _FullscreenVideoPlayerState();
}

class _FullscreenVideoPlayerState extends State<_FullscreenVideoPlayer> {
  late final VideoPlayerController _ctrl;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _ctrl = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() => _ready = true);
        _ctrl.play();
      });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: EdgeInsets.zero,
      child: Stack(
        children: [
          Center(
            child: _ready
                ? AspectRatio(
                    aspectRatio: _ctrl.value.aspectRatio,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        VideoPlayer(_ctrl),
                        VideoProgressIndicator(_ctrl, allowScrubbing: true),
                      ],
                    ),
                  )
                : const CircularProgressIndicator(color: Colors.white),
          ),
          Positioned(
            top: 32,
            right: 16,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 28),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          if (_ready)
            Positioned(
              bottom: 32,
              left: 0,
              right: 0,
              child: Center(
                child: IconButton(
                  iconSize: 56,
                  icon: Icon(
                    _ctrl.value.isPlaying
                        ? Icons.pause_circle_filled
                        : Icons.play_circle_filled,
                    color: Colors.white70,
                  ),
                  onPressed: () {
                    setState(() {
                      _ctrl.value.isPlaying ? _ctrl.pause() : _ctrl.play();
                    });
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
