import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/media_utils.dart';

/// Video seçtiren widget. [onChanged] ile üst widget'a iletir.
class JobVideoPicker extends StatefulWidget {
  final List<XFile> initialFiles;
  final ValueChanged<List<XFile>> onChanged;

  const JobVideoPicker({
    super.key,
    required this.onChanged,
    this.initialFiles = const [],
  });

  @override
  State<JobVideoPicker> createState() => _JobVideoPickerState();
}

class _JobVideoPickerState extends State<JobVideoPicker> {
  final ImagePicker _picker = ImagePicker();
  late List<XFile> _files;

  @override
  void initState() {
    super.initState();
    _files = List.from(widget.initialFiles);
  }

  Future<void> _pick(int index) async {
    final xFile = await _picker.pickVideo(
      source: ImageSource.gallery,
      maxDuration: const Duration(minutes: 2),
    );
    if (xFile == null) return;

    // 50MB boyut filtresi
    final valid = await validateVideoSize(xFile);
    if (!valid) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Video 50MB sınırını aşıyor. Lütfen daha küçük bir video seçin.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    setState(() {
      if (index < _files.length) {
        _files[index] = xFile;
      } else {
        _files.add(xFile);
      }
    });
    widget.onChanged(List.from(_files));
  }

  Future<void> _remove(int index) async {
    setState(() => _files.removeAt(index));
    widget.onChanged(List.from(_files));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.videocam, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'İlan Videoları (${_files.length})',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Opsiyonel. İşinizi anlatan kısa videolar ekleyebilirsiniz. (Max 50MB)',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Mevcut videolar
            for (int i = 0; i < _files.length; i++)
              _VideoSlotTile(
                xfile: _files[i],
                index: i + 1,
                onTap: () => _pick(i),
                onRemove: () => _remove(i),
              ),
            // "+" ekle butonu
            if (_files.length < 3) // Max 3 video limit
              _VideoSlotTile(
                xfile: null,
                index: _files.length + 1,
                onTap: () => _pick(_files.length),
                onRemove: null,
              ),
          ],
        ),
      ],
    );
  }
}

class _VideoSlotTile extends StatelessWidget {
  final XFile? xfile;
  final int index;
  final VoidCallback onTap;
  final VoidCallback? onRemove;

  const _VideoSlotTile({
    required this.xfile,
    required this.index,
    required this.onTap,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 90,
      height: 90,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: xfile != null ? AppColors.primaryLight.withValues(alpha: 0.3) : AppColors.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: xfile != null ? AppColors.primary : AppColors.border,
              width: xfile != null ? 2 : 1,
            ),
          ),
          child: xfile != null
              ? Stack(
                  children: [
                    const Center(
                      child: Icon(Icons.play_circle_outline, color: AppColors.primary, size: 40),
                    ),
                    if (onRemove != null)
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: onRemove,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close,
                                color: Colors.white, size: 14),
                          ),
                        ),
                      ),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.video_call_outlined,
                        color: AppColors.textHint, size: 28),
                    const SizedBox(height: 4),
                    Text('Video $index',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textHint)),
                  ],
                ),
        ),
      ),
    );
  }
}
