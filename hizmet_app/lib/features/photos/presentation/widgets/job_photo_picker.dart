import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';

/// Fotoğraf seçtiren widget. Phase 157: bulk multi-pick (5 max), en az 1 zorunlu.
class JobPhotoPicker extends StatefulWidget {
  static const int maxPhotos = 5;
  final List<File> initialFiles;
  final ValueChanged<List<File>> onChanged;

  const JobPhotoPicker({
    super.key,
    required this.onChanged,
    this.initialFiles = const [],
  });

  @override
  State<JobPhotoPicker> createState() => _JobPhotoPickerState();
}

class _JobPhotoPickerState extends State<JobPhotoPicker> {
  final ImagePicker _picker = ImagePicker();
  late List<File> _files;

  @override
  void initState() {
    super.initState();
    _files = List.from(widget.initialFiles);
  }

  Future<void> _pick(int index) async {
    final xFile = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 1920,
    );
    if (xFile == null) return;
    setState(() {
      if (index < _files.length) {
        _files[index] = File(xFile.path);
      } else {
        _files.add(File(xFile.path));
      }
    });
    widget.onChanged(List.from(_files));
  }

  /// Phase 157: bulk multi-pick — gallery'den birden fazla seç, 5 cap.
  Future<void> _pickMulti() async {
    final remaining = JobPhotoPicker.maxPhotos - _files.length;
    if (remaining <= 0) return;
    final xFiles = await _picker.pickMultiImage(
      imageQuality: 80,
      maxWidth: 1920,
      limit: remaining,
    );
    if (xFiles.isEmpty) return;
    final added = xFiles.take(remaining).map((x) => File(x.path)).toList();
    setState(() => _files.addAll(added));
    widget.onChanged(List.from(_files));
    if (xFiles.length > remaining && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'En fazla ${JobPhotoPicker.maxPhotos} fotoğraf eklenebilir.',
          ),
        ),
      );
    }
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
            const Icon(Icons.photo_camera, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'İlan Fotoğrafları (${_files.length}/${JobPhotoPicker.maxPhotos})',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const Spacer(),
            if (_files.length < JobPhotoPicker.maxPhotos)
              TextButton.icon(
                onPressed: _pickMulti,
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: const Text('Toplu Ekle'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'En az 1, en fazla ${JobPhotoPicker.maxPhotos} fotoğraf. "Toplu Ekle" ile birden fazla seçebilirsiniz.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Mevcut fotoğraflar
            for (int i = 0; i < _files.length; i++)
              _SlotTile(
                file: _files[i],
                index: i + 1,
                onTap: () => _pick(i),
                onRemove: () => _remove(i),
              ),
            // "+" ekle butonu (sadece cap'e ulaşılmadıysa)
            if (_files.length < JobPhotoPicker.maxPhotos)
              _SlotTile(
                file: null,
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

class _SlotTile extends StatelessWidget {
  final File? file;
  final int index;
  final VoidCallback onTap;
  final VoidCallback? onRemove;

  const _SlotTile({
    required this.file,
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
            color: file != null ? null : AppColors.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: file != null ? AppColors.primary : AppColors.border,
              width: file != null ? 2 : 1,
            ),
            image: file != null
                ? DecorationImage(image: FileImage(file!), fit: BoxFit.cover)
                : null,
          ),
          child: file != null
              ? Stack(
                  children: [
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
                    const Icon(Icons.add_photo_alternate_outlined,
                        color: AppColors.textHint, size: 28),
                    const SizedBox(height: 4),
                    Text('Foto $index',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textHint)),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Ağdan gelen URL listesini yatay scrollable galeri olarak gösterir.
class PhotoGalleryView extends StatelessWidget {
  final List<String> photoUrls;
  final double height;

  const PhotoGalleryView({
    super.key,
    required this.photoUrls,
    this.height = 200,
  });

  @override
  Widget build(BuildContext context) {
    if (photoUrls.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: photoUrls.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) => GestureDetector(
          onTap: () => _showFullScreen(context, i),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              photoUrls[i],
              height: height,
              width: height * 0.8,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: height * 0.8,
                color: AppColors.border,
                child: const Icon(Icons.broken_image, color: AppColors.textHint),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showFullScreen(BuildContext context, int initialIndex) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FullScreenGallery(
          urls: photoUrls,
          initialIndex: initialIndex,
        ),
      ),
    );
  }
}

class _FullScreenGallery extends StatefulWidget {
  final List<String> urls;
  final int initialIndex;
  const _FullScreenGallery({required this.urls, required this.initialIndex});

  @override
  State<_FullScreenGallery> createState() => _FullScreenGalleryState();
}

class _FullScreenGalleryState extends State<_FullScreenGallery> {
  late final PageController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${widget.initialIndex + 1}/${widget.urls.length}'),
      ),
      body: PageView.builder(
        controller: _ctrl,
        itemCount: widget.urls.length,
        itemBuilder: (_, i) => InteractiveViewer(
          child: Center(
            child: Image.network(
              widget.urls[i],
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const Icon(
                Icons.broken_image,
                color: Colors.white54,
                size: 64,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
