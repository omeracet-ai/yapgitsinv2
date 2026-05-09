import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../../../core/theme/app_colors.dart';

/// Phase 151: compact audio player for chat voice notes.
/// Play/pause button + linear progress bar + mm:ss timer.
class AudioPlayerWidget extends StatefulWidget {
  final String url;
  final int? durationSec;
  final bool isMe;

  const AudioPlayerWidget({
    super.key,
    required this.url,
    this.durationSec,
    this.isMe = false,
  });

  @override
  State<AudioPlayerWidget> createState() => _AudioPlayerWidgetState();
}

class _AudioPlayerWidgetState extends State<AudioPlayerWidget> {
  final AudioPlayer _player = AudioPlayer();
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _ready = false;
  bool _loading = false;
  bool _playing = false;

  @override
  void initState() {
    super.initState();
    if (widget.durationSec != null) {
      _duration = Duration(seconds: widget.durationSec!);
    }
    _player.positionStream.listen((p) {
      if (!mounted) return;
      setState(() => _position = p);
    });
    _player.durationStream.listen((d) {
      if (!mounted || d == null) return;
      setState(() => _duration = d);
    });
    _player.playerStateStream.listen((s) {
      if (!mounted) return;
      setState(() => _playing = s.playing);
      if (s.processingState == ProcessingState.completed) {
        _player.seek(Duration.zero);
        _player.pause();
      }
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    try {
      if (!_ready) {
        setState(() => _loading = true);
        await _player.setUrl(widget.url);
        _ready = true;
        if (mounted) setState(() => _loading = false);
      }
      if (_playing) {
        await _player.pause();
      } else {
        await _player.play();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmt(Duration d) {
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    final fg = widget.isMe ? Colors.white : AppColors.primary;
    final fgMuted = widget.isMe
        ? Colors.white.withValues(alpha: 0.75)
        : AppColors.textSecondary;
    final trackColor = widget.isMe
        ? Colors.white.withValues(alpha: 0.3)
        : AppColors.primaryLight;

    final total = _duration.inMilliseconds > 0
        ? _duration.inMilliseconds
        : (widget.durationSec ?? 0) * 1000;
    final progress =
        total > 0 ? (_position.inMilliseconds / total).clamp(0.0, 1.0) : 0.0;

    return Container(
      constraints: const BoxConstraints(maxWidth: 220, minWidth: 180),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: _loading ? null : _toggle,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: widget.isMe
                    ? Colors.white.withValues(alpha: 0.2)
                    : AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: _loading
                  ? Padding(
                      padding: const EdgeInsets.all(8),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: fg,
                      ),
                    )
                  : Icon(
                      _playing
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      color: fg,
                      size: 22,
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 3,
                    backgroundColor: trackColor,
                    valueColor: AlwaysStoppedAnimation<Color>(fg),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _playing || _position > Duration.zero
                      ? '${_fmt(_position)} / ${_fmt(_duration)}'
                      : _fmt(_duration),
                  style: TextStyle(fontSize: 11, color: fgMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
