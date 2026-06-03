import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/onboarding/data/onboarding_storage.dart';

/// Premium Dark Soft splash — "Y" yeşil rounded + "yapgitsin." lowercase.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animCtrl;
  late final Animation<double> _scaleAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _scaleAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack);
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeIn);
    // Phase 391 — reduce-motion AÇIK ise scale+fade atla, anında final state.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (MediaQuery.of(context).disableAnimations) {
        _animCtrl.value = 1.0;
      } else {
        _animCtrl.forward();
      }
    });
    _navigate();
  }

  Future<void> _navigate() async {
    // Phase 268c — minimum splash duration: 3500ms. Auth state'in çözülmesini de
    // bekle (max +2000ms grace) ki router redirect'i kullanıcıya yansımadan
    // yönlendirme deterministik olsun.
    final minDuration = Future.delayed(const Duration(milliseconds: 3500));
    final authResolved = _waitAuthResolved(
      timeout: const Duration(milliseconds: 5500),
    );
    await Future.wait([minDuration, authResolved]);
    if (!mounted) return;
    final seen = await OnboardingStorage.hasSeenOnboarding();
    if (!mounted) return;
    if (seen) {
      context.go('/');
    } else {
      context.go('/hos-geldiniz');
    }
  }

  Future<void> _waitAuthResolved({required Duration timeout}) async {
    final sw = Stopwatch()..start();
    while (sw.elapsed < timeout) {
      final s = ProviderScope.containerOf(context, listen: false)
          .read(authStateProvider);
      if (s is! AuthInitial && s is! AuthLoading) return;
      await Future.delayed(const Duration(milliseconds: 50));
    }
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 2026-05-26 — splash her zaman dark (tema fark etmez, marka tutarlılığı).
    return Scaffold(
      backgroundColor: const Color(0xFF0C1117),
      body: Stack(
        children: [
          // Subtle green radial glow
          Center(
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.15),
                    AppColors.primary.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
          ),
          Center(
            child: ScaleTransition(
              scale: _scaleAnim,
              child: FadeTransition(
                opacity: _fadeAnim,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Launcher icon (assets/icons/app_icon.png)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset(
                        'assets/icons/app_icon.png',
                        width: 96,
                        height: 96,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'yapgitsin.',
                      style: GoogleFonts.inter(
                        // Splash her zaman dark — beyaz tipografi.
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'PREMIUM HİZMET PLATFORMU',
                      style: GoogleFonts.inter(
                        color: Colors.white60,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 2.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
