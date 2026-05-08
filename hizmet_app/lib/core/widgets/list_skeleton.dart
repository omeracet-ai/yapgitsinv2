import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

Color _baseColor() => Colors.grey.shade300;
Color _highlightColor() => Colors.grey.shade100;

Widget _box(double w, double h, {double r = 4}) => Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(r),
      ),
    );

/// Generic skeleton list — repeats [child] [itemCount] times wrapped in shimmer.
class ListSkeleton extends StatelessWidget {
  final int itemCount;
  final EdgeInsetsGeometry padding;
  final WidgetBuilder itemBuilder;

  const ListSkeleton({
    super.key,
    this.itemCount = 6,
    this.padding = const EdgeInsets.all(16),
    required this.itemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: _baseColor(),
      highlightColor: _highlightColor(),
      child: ListView.separated(
        padding: padding,
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, _) => itemBuilder(ctx),
      ),
    );
  }
}

/// Job card skeleton — title + meta + budget badge layout.
class JobCardSkeleton extends StatelessWidget {
  const JobCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _box(52, 52, r: 14),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _box(160, 14),
                    const SizedBox(height: 8),
                    _box(110, 10),
                  ],
                ),
              ),
              _box(60, 22, r: 10),
            ],
          ),
          const SizedBox(height: 14),
          _box(double.infinity, 10),
          const SizedBox(height: 6),
          _box(220, 10),
        ],
      ),
    );
  }
}

/// Provider/worker card skeleton — avatar + name + categories + rating.
class ProviderCardSkeleton extends StatelessWidget {
  const ProviderCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _box(140, 14),
                const SizedBox(height: 6),
                _box(80, 10),
                const SizedBox(height: 6),
                _box(180, 10),
              ],
            ),
          ),
          _box(28, 28, r: 14),
        ],
      ),
    );
  }
}

/// Notification card skeleton — small icon + title + body.
class NotificationSkeleton extends StatelessWidget {
  const NotificationSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _box(44, 44, r: 12),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _box(180, 12),
                const SizedBox(height: 6),
                _box(double.infinity, 10),
                const SizedBox(height: 4),
                _box(80, 9),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
