import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Phase 79 — Slide-in toast banner shown via [InAppNotificationService].
///
/// 80px tall card pinned near the top safe-area, animates in/out with a
/// vertical [SlideTransition]. Tap → onTap, X button → onDismiss.
class InAppNotificationBanner extends StatefulWidget {
  final String title;
  final String message;
  final String? type;
  final VoidCallback? onTap;
  final VoidCallback onDismiss;

  const InAppNotificationBanner({
    super.key,
    required this.title,
    required this.message,
    required this.onDismiss,
    this.type,
    this.onTap,
  });

  @override
  State<InAppNotificationBanner> createState() =>
      _InAppNotificationBannerState();
}

class _InAppNotificationBannerState extends State<InAppNotificationBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slide;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _slide = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _handleDismiss() async {
    if (mounted) await _ctrl.reverse();
    widget.onDismiss();
  }

  (IconData, Color, Color) _styleForType() {
    switch (widget.type) {
      case 'new_offer':
        return (Icons.local_offer_rounded, AppColors.primary,
            AppColors.primaryLight);
      case 'offer_accepted':
        return (Icons.check_circle_rounded, Colors.green, Colors.green.shade50);
      case 'offer_rejected':
        return (Icons.cancel_rounded, Colors.red, Colors.red.shade50);
      case 'booking_request':
        return (Icons.calendar_today, Colors.orange, Colors.orange.shade50);
      case 'booking_confirmed':
        return (Icons.event_available, Colors.teal, Colors.teal.shade50);
      case 'booking_completed':
        return (Icons.stars_rounded, Colors.amber, Colors.amber.shade50);
      case 'booking_cancelled':
        return (Icons.event_busy, Colors.red, Colors.red.shade50);
      case 'new_review':
        return (Icons.star_rounded, Colors.amber, Colors.amber.shade50);
      case 'new_message':
        return (Icons.chat_bubble_rounded, AppColors.primary,
            AppColors.primaryLight);
      case 'system':
        return (Icons.campaign, AppColors.primary, AppColors.primaryLight);
      default:
        return (Icons.notifications_rounded, AppColors.primary,
            AppColors.primaryLight);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (icon, iconColor, bgColor) = _styleForType();
    final mq = MediaQuery.of(context);

    return Positioned(
      top: mq.padding.top + 8,
      left: 12,
      right: 12,
      child: Material(
        color: Colors.transparent,
        child: SlideTransition(
          position: _slide,
          child: FadeTransition(
            opacity: _fade,
            child: GestureDetector(
              onTap: () async {
                if (mounted) await _ctrl.reverse();
                widget.onTap?.call();
                widget.onDismiss();
              },
              child: Container(
                height: 80,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                          color: bgColor,
                          borderRadius: BorderRadius.circular(12)),
                      child: Icon(icon, color: iconColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.message,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              height: 1.25,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close,
                          size: 18, color: AppColors.textHint),
                      onPressed: _handleDismiss,
                      splashRadius: 18,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
