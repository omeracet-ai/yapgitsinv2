import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import '../../../core/theme/app_colors.dart';

/// Phase 151: long-press to record a voice note. Slide-cancel on drag-up.
/// On release, calls [onRecorded] with (path, durationSec).
class VoiceRecorderButton extends StatefulWidget {
  final void Function(String path, int durationSec) onRecorded;

  const VoiceRecorderButton({super.key, required this.onRecorded});

  @override
  State<VoiceRecorderButton> createState() => _VoiceRecorderButtonState();
}

class _VoiceRecorderButtonState extends State<VoiceRecorderButton>
    with SingleTickerProviderStateMixin {
  final AudioRecorder _recorder = AudioRecorder();
  bool _recording = false;
  bool _cancelled = false;
  DateTime? _startedAt;
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  String? _filePath;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _pulse.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<bool> _ensurePermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  Future<void> _start() async {
    final ok = await _ensurePermission();
    if (!ok) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mikrofon izni gerekli')),
        );
      }
      return;
    }
    final dir = await getTemporaryDirectory();
    final path =
        '${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
    try {
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000),
        path: path,
      );
    } catch (_) {
      return;
    }
    _filePath = path;
    _cancelled = false;
    _startedAt = DateTime.now();
    setState(() {
      _recording = true;
      _elapsed = Duration.zero;
    });
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (!mounted || _startedAt == null) return;
      setState(() => _elapsed = DateTime.now().difference(_startedAt!));
    });
  }

  Future<void> _stop({required bool cancel}) async {
    _ticker?.cancel();
    _ticker = null;
    if (!_recording) return;
    final duration = _elapsed;
    setState(() => _recording = false);
    String? path;
    try {
      path = await _recorder.stop();
    } catch (_) {
      path = _filePath;
    }
    if (cancel || path == null) {
      if (path != null) {
        try {
          await File(path).delete();
        } catch (_) {}
      }
      return;
    }
    final secs = duration.inSeconds;
    if (secs < 1) {
      try {
        await File(path).delete();
      } catch (_) {}
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Çok kısa, basılı tutun')),
        );
      }
      return;
    }
    widget.onRecorded(path, secs);
  }

  String _fmt(Duration d) {
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => _start(),
      onLongPressEnd: (_) => _stop(cancel: _cancelled),
      onLongPressMoveUpdate: (d) {
        // Slide up beyond ~60px → mark for cancel.
        final shouldCancel = d.localOffsetFromOrigin.dy < -60;
        if (shouldCancel != _cancelled) {
          setState(() => _cancelled = shouldCancel);
        }
      },
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          if (_recording)
            Positioned(
              right: 56,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _cancelled ? AppColors.error : Colors.black87,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _cancelled
                          ? Icons.delete_outline_rounded
                          : Icons.fiber_manual_record_rounded,
                      color: Colors.white,
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _cancelled ? 'İptal' : _fmt(_elapsed),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                    if (!_cancelled) ...[
                      const SizedBox(width: 8),
                      const Text(
                        '↑ İptal',
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          AnimatedBuilder(
            animation: _pulse,
            builder: (_, __) {
              final scale = _recording ? (1.0 + _pulse.value * 0.18) : 1.0;
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _recording
                        ? AppColors.error
                        : AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.mic_rounded,
                    color: _recording ? Colors.white : AppColors.primary,
                    size: 22,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
