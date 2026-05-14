import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/job_repository.dart';

class CompletionPhotosSection extends ConsumerStatefulWidget {
  final String jobId;
  final List<String> initialPhotos;
  final bool canUpload;

  const CompletionPhotosSection({
    super.key,
    required this.jobId,
    required this.initialPhotos,
    required this.canUpload,
  });

  @override
  ConsumerState<CompletionPhotosSection> createState() =>
      _CompletionPhotosSectionState();
}

class _CompletionPhotosSectionState
    extends ConsumerState<CompletionPhotosSection> {
  late List<String> _photos;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _photos = List<String>.from(widget.initialPhotos);
  }

  String _absoluteUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${ApiConstants.baseUrl}$url';
  }

  Future<void> _pickAndUpload() async {
    final remaining = 5 - _photos.length;
    if (remaining <= 0) return;
    try {
      final picker = ImagePicker();
      final picked = await picker.pickMultiImage(limit: remaining);
      if (picked.isEmpty) return;
      final files = picked.take(remaining).toList();
      setState(() => _uploading = true);
      final repo = ref.read(jobRepositoryProvider);
      final updated = await repo.uploadCompletionPhotos(widget.jobId, files);
      if (!mounted) return;
      setState(() {
        _photos = updated;
        _uploading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Fotoğraflar yüklendi'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _uploading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showFullScreen(String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: InteractiveViewer(
            child: Center(
              child: CachedNetworkImage(imageUrl: _absoluteUrl(url)),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_photos.isEmpty && !widget.canUpload) {
      return const SizedBox.shrink();
    }
    return Stack(
      children: [
        Container(
          width: double.infinity,
          margin: const EdgeInsets.symmetric(horizontal: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.photo_library_outlined,
                      size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'İş Tamamlama Fotoğrafları',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  Text('(${_photos.length}/5)',
                      style: TextStyle(
                          color: Colors.grey.shade600, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 10),
              if (_photos.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Henüz tamamlama fotoğrafı yüklenmedi.',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                )
              else
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                  children: _photos
                      .map((url) => GestureDetector(
                            onTap: () => _showFullScreen(url),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: _absoluteUrl(url),
                                fit: BoxFit.cover,
                                placeholder: (_, __) => Container(
                                    color: Colors.grey.shade200),
                                errorWidget: (_, __, ___) => Container(
                                    color: Colors.grey.shade200,
                                    child: const Icon(Icons.broken_image)),
                              ),
                            ),
                          ))
                      .toList(),
                ),
              if (widget.canUpload && _photos.length < 5) ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _uploading ? null : _pickAndUpload,
                    icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                    label: const Text('Fotoğraf Ekle'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (_uploading)
          Positioned.fill(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            ),
          ),
      ],
    );
  }
}
