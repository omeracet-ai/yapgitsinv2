import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Phase 429 — OverflowSlideRow
///
/// Belirgin <> ok kontrollü yatay slide list. Multi-line Wrap'a düşmek yerine
/// içerik genişlik'i aşıyorsa kullanıcı sağa/sola kaydırabilir; ayrıca
/// belirgin renkli ok butonları görsel sinyal verir (içerik kayıyor demek).
///
/// Kullanım:
/// ```dart
/// OverflowSlideRow(
///   children: [
///     _badgeChip(...),
///     _badgeChip(...),
///     _statChip(...),
///   ],
///   height: 30,
/// )
/// ```
///
/// İçerik tek satıra sığıyorsa oklar görünmez — saf yatay liste gibi davranır.
/// Aşıyorsa sol/sağ kenarda fade + tıklanabilir <> okları belirir; aktif
/// (tıklanabilir) ok AppColors.primary ile vurgulu, pasif ok soluk.
class OverflowSlideRow extends StatefulWidget {
  final List<Widget> children;
  final double height;
  final double spacing;
  final EdgeInsets padding;

  /// Tek tap'ta ne kadar kaydırılsın (default 140dp ≈ bir chip + gap).
  final double scrollStep;

  /// Ok butonlarının rengi. Default AppColors.primary.
  final Color? arrowColor;

  /// Ok butonlarının arkaplan rengi (yarı saydam disk efekti).
  final Color? arrowBackground;

  const OverflowSlideRow({
    super.key,
    required this.children,
    this.height = 36,
    this.spacing = 8,
    this.padding = const EdgeInsets.symmetric(horizontal: 4),
    this.scrollStep = 140,
    this.arrowColor,
    this.arrowBackground,
  });

  @override
  State<OverflowSlideRow> createState() => _OverflowSlideRowState();
}

class _OverflowSlideRowState extends State<OverflowSlideRow> {
  final ScrollController _ctrl = ScrollController();
  bool _canLeft = false;
  bool _canRight = false;
  bool _isOverflow = false;

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(_recompute);
    WidgetsBinding.instance.addPostFrameCallback((_) => _recompute());
  }

  @override
  void didUpdateWidget(covariant OverflowSlideRow old) {
    super.didUpdateWidget(old);
    WidgetsBinding.instance.addPostFrameCallback((_) => _recompute());
  }

  @override
  void dispose() {
    _ctrl.removeListener(_recompute);
    _ctrl.dispose();
    super.dispose();
  }

  void _recompute() {
    if (!mounted || !_ctrl.hasClients) return;
    final pos = _ctrl.position;
    final overflow = pos.maxScrollExtent > 0.5;
    final left = overflow && pos.pixels > 1;
    final right = overflow && pos.pixels < pos.maxScrollExtent - 1;
    if (overflow != _isOverflow || left != _canLeft || right != _canRight) {
      setState(() {
        _isOverflow = overflow;
        _canLeft = left;
        _canRight = right;
      });
    }
  }

  void _scrollBy(double delta) {
    if (!_ctrl.hasClients) return;
    final target =
        (_ctrl.offset + delta).clamp(0.0, _ctrl.position.maxScrollExtent);
    _ctrl.animateTo(
      target,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.children.isEmpty) return const SizedBox.shrink();
    final arrowFg = widget.arrowColor ?? AppColors.primary;
    final arrowBg = widget.arrowBackground ??
        AppColors.surface.withValues(alpha: 0.92);

    return SizedBox(
      height: widget.height + 2, // shadow / outline payı
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Yatay ListView
          ListView.separated(
            controller: _ctrl,
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: widget.padding,
            itemCount: widget.children.length,
            separatorBuilder: (_, __) => SizedBox(width: widget.spacing),
            itemBuilder: (_, i) => widget.children[i],
          ),
          // Sol fade overlay (sadece sola kaydırılabilirken)
          if (_canLeft)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 32,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        arrowBg,
                        arrowBg.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          // Sağ fade overlay
          if (_canRight)
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              width: 32,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerRight,
                      end: Alignment.centerLeft,
                      colors: [
                        arrowBg,
                        arrowBg.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          // Sol ok
          if (_isOverflow)
            Positioned(
              left: 0,
              child: _ArrowButton(
                icon: Icons.chevron_left_rounded,
                active: _canLeft,
                color: arrowFg,
                bgColor: arrowBg,
                onTap: () => _scrollBy(-widget.scrollStep),
              ),
            ),
          // Sağ ok
          if (_isOverflow)
            Positioned(
              right: 0,
              child: _ArrowButton(
                icon: Icons.chevron_right_rounded,
                active: _canRight,
                color: arrowFg,
                bgColor: arrowBg,
                onTap: () => _scrollBy(widget.scrollStep),
              ),
            ),
        ],
      ),
    );
  }
}

class _ArrowButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  const _ArrowButton({
    required this.icon,
    required this.active,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: active ? onTap : null,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedOpacity(
          opacity: active ? 1.0 : 0.32,
          duration: const Duration(milliseconds: 200),
          child: Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              border: Border.all(
                  color: color.withValues(alpha: active ? 0.9 : 0.35),
                  width: 1.2),
              boxShadow: active
                  ? [
                      BoxShadow(
                        color: color.withValues(alpha: 0.25),
                        blurRadius: 6,
                        offset: const Offset(0, 1),
                      ),
                    ]
                  : null,
            ),
            child: Icon(icon, size: 18, color: color),
          ),
        ),
      ),
    );
  }
}
