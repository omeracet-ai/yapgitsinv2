import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lottie/lottie.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';
import '../providers/navigation_provider.dart';

class SuccessScreen extends ConsumerWidget {
  final String title;
  final String message;
  final String btnText;
  final String targetRoute;
  final int targetTab;
  /// İsteğe bağlı ikincil CTA (örn. "Yeni İlan Ver"). Verilirse ana
  /// CTA'nın altında outlined buton olarak çıkar.
  final String? secondaryBtnText;
  final String? secondaryTargetRoute;
  final int? secondaryTargetTab;
  /// Phase 291 — Üçüncü CTA (örn. "Hızlı Hizmet Verenlere Ulaş"). Verilirse
  /// secondary'nin altında ikinci bir outlined buton olarak çıkar.
  final String? tertiaryBtnText;
  final String? tertiaryTargetRoute;
  final int? tertiaryTargetTab;
  /// Vurgulu renk — tertiary butona gradient yeşil ya da accent uygulamak için.
  final Color? tertiaryColor;
  final IconData? tertiaryIcon;

  const SuccessScreen({
    super.key,
    required this.title,
    required this.message,
    required this.btnText,
    this.targetRoute = '/',
    this.targetTab = 0,
    this.secondaryBtnText,
    this.secondaryTargetRoute,
    this.secondaryTargetTab,
    this.tertiaryBtnText,
    this.tertiaryTargetRoute,
    this.tertiaryTargetTab,
    this.tertiaryColor,
    this.tertiaryIcon,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Lottie.network(
                'https://assets10.lottiefiles.com/packages/lf20_pqnfmone.json',
                repeat: false,
                height: 200,
              ),
              const SizedBox(height: 24),
              Text(
                title,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ).animate().fade().scale(),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
              ).animate().fade(delay: 200.ms).slideY(begin: 0.1),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    ref.read(selectedTabProvider.notifier).state = targetTab;
                    context.go(targetRoute);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(btnText,
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ).animate().fade(delay: 400.ms).scale(),
              if (secondaryBtnText != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      if (secondaryTargetTab != null) {
                        ref.read(selectedTabProvider.notifier).state =
                            secondaryTargetTab!;
                      }
                      context.go(secondaryTargetRoute ?? targetRoute);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(
                          color: AppColors.primary.withValues(alpha: 0.6)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text(secondaryBtnText!,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ).animate().fade(delay: 500.ms).slideY(begin: 0.1),
              ],
              if (tertiaryBtnText != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (tertiaryTargetTab != null) {
                        ref.read(selectedTabProvider.notifier).state =
                            tertiaryTargetTab!;
                      }
                      context.go(tertiaryTargetRoute ?? targetRoute);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: tertiaryColor ?? AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    icon: Icon(tertiaryIcon ?? Icons.map_outlined,
                        color: Colors.white),
                    label: Text(
                      tertiaryBtnText!,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ).animate().fade(delay: 600.ms).scale(begin: const Offset(0.9, 0.9)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
