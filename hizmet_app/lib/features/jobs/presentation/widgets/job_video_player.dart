import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';

class JobVideoPlayer extends StatefulWidget {
  final String videoUrl;
  const JobVideoPlayer({super.key, required this.videoUrl});

  @override
  State<JobVideoPlayer> createState() => _JobVideoPlayerState();
}

class _JobVideoPlayerState extends State<JobVideoPlayer> {
  late VideoPlayerController _vpController;
  ChewieController? _chewieController;
  bool _initialized = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      _vpController = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
      );
      await _vpController.initialize();
      _chewieController = ChewieController(
        videoPlayerController: _vpController,
        aspectRatio: _vpController.value.aspectRatio,
        autoPlay: false,
        looping: false,
        allowFullScreen: true,
        placeholder: Container(color: Colors.black),
      );
      if (mounted) setState(() => _initialized = true);
    } catch (_) {
      if (mounted) setState(() => _error = 'Video yüklenemedi');
    }
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _vpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return _placeholder(Icons.error_outline, _error!);
    }
    if (!_initialized) {
      return _placeholder(null, '');
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: 280,
        height: 250,
        child: Chewie(controller: _chewieController!),
      ),
    );
  }

  Widget _placeholder(IconData? icon, String label) {
    return Container(
      width: 280,
      height: 250,
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(12),
      ),
      child: icon != null
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: Colors.white54, size: 36),
                const SizedBox(height: 8),
                Text(label,
                    style: const TextStyle(color: Colors.white54, fontSize: 13)),
              ],
            )
          : const Center(
              child: CircularProgressIndicator(color: Colors.white54)),
    );
  }
}
