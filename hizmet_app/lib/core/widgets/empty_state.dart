import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Reusable rich empty state — icon (or emoji) + title + optional message + optional CTA.
class EmptyState extends StatelessWidget {
  final IconData? icon;
  final String? emoji;
  final String title;
  final String? message;
  final Widget? action;
  final EdgeInsetsGeometry padding;

  const EmptyState({
    super.key,
    this.icon,
    this.emoji,
    required this.title,
    this.message,
    this.action,
    this.padding = const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
  }) : assert(icon != null || emoji != null,
            'Either icon or emoji must be provided');

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  width: 1,
                ),
              ),
              alignment: Alignment.center,
              child: emoji != null
                  ? Text(emoji!, style: const TextStyle(fontSize: 44))
                  : Icon(icon, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: 20),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
