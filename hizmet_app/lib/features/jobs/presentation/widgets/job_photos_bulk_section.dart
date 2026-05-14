import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/job_repository.dart';

/// Phase 203 — İlan sahibi için bulk fotoğraf yükleme bölümü.
/// pickMultiImage (max 5 toplam), grid önizleme, tek request ile yükle.
class JobPhotosBulkSection extends ConsumerStatefulWidget {
  final String jobId;
  final List<String> initialPhotos;

  const JobPhotosBulkSection({
    super.key,
    required this.jobId,
    required this.initialPhotos,
  });

  @override
  ConsumerState<JobPhotosBulkSection> createState() =>
      _JobPhotosBulkSectionState();
}

class _JobPhotosBulkSectionState extends ConsumerState<JobPhotosBulkSection> {
  late List<String> _photos;
  List<XFile> _pending = [];
  bool _uploading = false;

  static const int _maxPhotos = 5;

  @override
  void initState() {
    super.initState();
    _photos = List<String>.from(widget.initialPhotos);
  }

  String _absoluteUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${ApiConstants.baseUrl}$url';
  }

  Future<void> _pickMulti() async {
    final remaining = _maxPhotos - _photos.length - _pending.length;
    if (remaining <= 0) return;
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(limit: remaining);
    if (picked.isEmpty) return;
    setState(() => _pending.addAll(picked.take(remaining)));
    if (picked.length > remaining && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('En fazla $_maxPhotos fotoğraf eklenebilir.'),
          backgroundColor: AppColors.warning,
        ),
      );
    }
  }

  void _removePending(int index) =>
      setState(() => _pending.removeAt(index));

  Future<void> _upload() async {
    if (_pending.isEmpty) return;
    setState(() => _uploading = true);
    try {
      final repo = ref.read(jobRepositoryProvider);
      final updated =
          await repo.uploadJobPhotosBulk(widget.jobId, _pending);
      if (!mounted) return;
      setState(() {
        _photos = updated;
        _pending = [];
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

  @override
  Widget build(BuildContext context) {
    final totalSelected = _photos.length + _pending.length;
    final canAdd = totalSelected < _maxPhotos;

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
                      'İlan Fotoğrafları',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  Text('($totalSelected/$_maxPhotos)',
                      style: TextStyle(
                          color: Colors.grey.shade600, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 10),

              // Mevcut yüklü fotoğraflar
              if (_photos.isNotEmpty)
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                  children: _photos
                      .map((url) => ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: _absoluteUrl(url),
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: Colors.grey.shade200),
                              errorWidget: (_, __, ___) => Container(
                                  color: Colors.grey.shade200,
                                  child: const Icon(Icons.broken_image)),
                            ),
                          ))
                      .toList(),
                ),

              // Seçilen (henüz yüklenmemiş) fotoğraflar — önizleme
              if (_pending.isNotEmpty) ...[
                if (_photos.isNotEmpty) const SizedBox(height: 8),
                const Text(
                  'Yüklenecekler:',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 6),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                  children: List.generate(_pending.length, (i) {
                    final xf = _pending[i];
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            xf.path,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                            errorBuilder: (_, __, ___) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.image_outlined),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => _removePending(i),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle),
                              child: const Icon(Icons.close,
                                  color: Colors.white, size: 14),
                            ),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
              ],

              const SizedBox(height: 10),

              // Aksiyon butonları
              Row(
                children: [
                  if (canAdd)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _uploading ? null : _pickMulti,
                        icon: const Icon(Icons.add_photo_alternate_outlined,
                            size: 18),
                        label: const Text('Fotoğraf Seç'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                        ),
                      ),
                    ),
                  if (canAdd && _pending.isNotEmpty)
                    const SizedBox(width: 8),
                  if (_pending.isNotEmpty)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _uploading ? null : _upload,
                        icon: const Icon(Icons.cloud_upload_outlined, size: 18),
                        label: Text('Yükle (${_pending.length})'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
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
