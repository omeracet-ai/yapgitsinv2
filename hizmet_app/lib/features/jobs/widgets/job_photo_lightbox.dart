import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

/// Phase 52 — Tam ekran iş fotoğrafı galerisi.
/// PageView + InteractiveViewer (zoom 1x–4x) + paylaş butonu.
class JobPhotoLightbox extends StatefulWidget {
  final List<String> photos;
  final int initialIndex;

  const JobPhotoLightbox({
    super.key,
    required this.photos,
    this.initialIndex = 0,
  });

  @override
  State<JobPhotoLightbox> createState() => _JobPhotoLightboxState();
}

class _JobPhotoLightboxState extends State<JobPhotoLightbox> {
  late final PageController _controller;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _share() async {
    if (widget.photos.isEmpty) return;
    final url = widget.photos[_currentIndex];
    await SharePlus.instance.share(
      ShareParams(text: url, subject: 'İş fotoğrafı'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('${_currentIndex + 1} / ${widget.photos.length}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Paylaş',
            onPressed: _share,
          ),
        ],
      ),
      body: PageView.builder(
        controller: _controller,
        itemCount: widget.photos.length,
        onPageChanged: (i) => setState(() => _currentIndex = i),
        itemBuilder: (_, i) => InteractiveViewer(
          minScale: 1,
          maxScale: 4,
          child: Center(
            child: Image.network(
              widget.photos[i],
              fit: BoxFit.contain,
              loadingBuilder: (ctx, child, progress) {
                if (progress == null) return child;
                return const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                );
              },
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
