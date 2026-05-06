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

  const SuccessScreen({
    super.key,
    required this.title,
    required this.message,
    required this.btnText,
    this.targetRoute = '/',
    this.targetTab = 0,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
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
                style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
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
            ],
          ),
        ),
      ),
    );
  }
}
