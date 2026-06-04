import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_colors.dart';
import '../../photos/data/photo_repository.dart';
import '../presentation/screens/public_profile_screen.dart';

/// Worker portfolio galerisi (Phase 43 fotoğraf).
/// Phase 419 — video desteği kaldırıldı (kullanıcı isteği).
/// - Sahibi ise üstte "+ Fotoğraf" butonu, her item'da X.
/// - Fotoğraf tap → lightbox.
class PortfolioGallery extends ConsumerStatefulWidget {
  final List<String> photos;
  final bool isOwner;
  final String userId;
  const PortfolioGallery({
    super.key,
    required this.photos,
    required this.isOwner,
    required this.userId,
  });

  @override
  ConsumerState<PortfolioGallery> createState() => _PortfolioGalleryState();
}

class _PortfolioGalleryState extends ConsumerState<PortfolioGallery> {
  bool _busy = false;

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
      await repo.uploadPortfolioPhoto(picked);
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

  @override
  Widget build(BuildContext context) {
    if (widget.photos.isEmpty && !widget.isOwner) {
      return const SizedBox.shrink();
    }
    // Phase 421 — Wrap → yatay slide ListView. Row sınırına ulaşan
    // resimler alt satıra inmek yerine yatayda kaydırılır. Tile 90×90
    // sabit yükseklik; parent height: 90.
    final tiles = <Widget>[
      if (widget.isOwner) _addTile(_addPhoto, _busy, Icons.add_a_photo_outlined, 'Foto'),
      ...List.generate(widget.photos.length, (i) {
        final url = widget.photos[i];
        return _photoTile(url, i);
      }),
    ];
    return SizedBox(
      height: 96, // 90 + bordür/badge taşması payı
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.none,
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 3),
        itemCount: tiles.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => tiles[i],
      ),
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

// Phase 419 — _FullscreenVideoPlayer kaldırıldı (video desteği bitti).
