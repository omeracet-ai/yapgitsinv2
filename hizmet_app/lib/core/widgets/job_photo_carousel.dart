import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_colors.dart';
import '../../features/jobs/widgets/job_photo_lightbox.dart';

/// Phase 434 — Portfolio-style horizontal photo carousel for JobDetailScreen.
///
/// Davranış:
///  • 0 foto  → hiçbir şey render etmez (boş SizedBox)
///  • 1 foto  → tek, ortalanmış büyük kart (300×300)
///  • 2-3     → yatay ListView slider (280×280 kart, 12px gap)
///  • 4+      → yatay slider + alt-merkez "x / y" sayaç chip
///  • Soldan/sağdan fade gradient overflow ipucu (≥2 foto)
///  • Tap → JobPhotoLightbox (mevcut full-screen viewer)
///  • Skeleton (shimmer) placeholder + cached_network_image
class JobPhotoCarousel extends StatefulWidget {
  final List<String> photos;
  final double cardSize;
  final double singleCardSize;

  // Phase 496 — tek foto kartı slider ile aynı pixel ebatında (220×220).
  // Önce 300×300'dü, ilan detayında devasa görünüyordu.
  const JobPhotoCarousel({
    super.key,
    required this.photos,
    this.cardSize = 220,
    this.singleCardSize = 220,
  });

  @override
  State<JobPhotoCarousel> createState() => _JobPhotoCarouselState();
}

class _JobPhotoCarouselState extends State<JobPhotoCarousel> {
  final ScrollController _scrollCtrl = ScrollController();
  int _currentIdx = 0;

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    // 220 kart + 12 gap = 232px adım
    const step = 232.0;
    final idx = (_scrollCtrl.offset / step).round().clamp(
          0,
          widget.photos.length - 1,
        );
    if (idx != _currentIdx) {
      setState(() => _currentIdx = idx);
    }
  }

  void _openLightbox(int index) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => JobPhotoLightbox(
          photos: widget.photos,
          initialIndex: index,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.photos.isEmpty) return const SizedBox.shrink();

    if (widget.photos.length == 1) {
      return _buildSingleCard();
    }

    // Phase 457 (hatalar.txt #13) — 2-4 foto → row'a sığacak şekilde 4-per-row
    // grid. 5+ foto → mevcut yatay slider (row taşar, slider aktif).
    if (widget.photos.length <= 4) {
      return _buildGrid();
    }

    return _buildSlider();
  }

  /// Phase 457 — 4-per-row grid (2-4 fotoğraf için).
  Widget _buildGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: LayoutBuilder(
        builder: (ctx, constraints) {
          const gap = 8.0;
          // 4 sütun + 3 gap
          final available = constraints.maxWidth - gap * 3;
          final tileSize = available / 4;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: List.generate(widget.photos.length, (i) {
              return GestureDetector(
                onTap: () => _openLightbox(i),
                child: _PhotoCard(
                  url: widget.photos[i],
                  size: tileSize,
                ),
              );
            }),
          );
        },
      ),
    );
  }

  Widget _buildSingleCard() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        child: GestureDetector(
          onTap: () => _openLightbox(0),
          child: _PhotoCard(
            url: widget.photos.first,
            size: widget.singleCardSize,
          ),
        ),
      ),
    );
  }

  Widget _buildSlider() {
    final showCounter = widget.photos.length >= 4;

    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        SizedBox(
          height: widget.cardSize,
          child: ListView.separated(
            controller: _scrollCtrl,
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            itemCount: widget.photos.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (ctx, i) {
              return GestureDetector(
                onTap: () => _openLightbox(i),
                child: _PhotoCard(
                  url: widget.photos[i],
                  size: widget.cardSize,
                ),
              );
            },
          ),
        ),
        // Sol fade
        Positioned(
          left: 0,
          top: 0,
          bottom: 0,
          width: 18,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    AppColors.surface,
                    AppColors.surface.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
        ),
        // Sağ fade
        Positioned(
          right: 0,
          top: 0,
          bottom: 0,
          width: 18,
          child: IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerRight,
                  end: Alignment.centerLeft,
                  colors: [
                    AppColors.surface,
                    AppColors.surface.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
        ),
        // Counter chip (4+ foto)
        if (showCounter)
          Positioned(
            bottom: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentIdx + 1} / ${widget.photos.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _PhotoCard extends StatelessWidget {
  final String url;
  final double size;

  const _PhotoCard({required this.url, required this.size});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: size,
        height: size,
        child: CachedNetworkImage(
          imageUrl: url,
          fit: BoxFit.cover,
          placeholder: (ctx, _) => _Skeleton(size: size),
          errorWidget: (ctx, _, __) => Container(
            color: AppColors.surfaceElevated,
            alignment: Alignment.center,
            child: Icon(
              Icons.broken_image,
              color: AppColors.textHint,
              size: 40,
            ),
          ),
        ),
      ),
    );
  }
}

class _Skeleton extends StatelessWidget {
  final double size;
  const _Skeleton({required this.size});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.surfaceElevated,
      highlightColor: AppColors.border,
      child: Container(
        width: size,
        height: size,
        color: AppColors.surfaceElevated,
      ),
    );
  }
}
