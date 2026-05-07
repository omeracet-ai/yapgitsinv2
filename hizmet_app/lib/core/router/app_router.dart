import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../features/home/presentation/screens/main_shell.dart';
import '../../../features/auth/presentation/screens/login_screen.dart';
import '../../../features/auth/presentation/screens/register_screen.dart';
import '../../../features/jobs/presentation/screens/post_job_screen.dart';
import '../../../features/tokens/presentation/screens/token_screen.dart';
import '../../../features/ai/presentation/screens/support_agent_screen.dart';
import '../../../features/auth/presentation/screens/public_profile_screen.dart';
import '../../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../../features/job_templates/presentation/job_templates_screen.dart';
import '../../../features/statements/presentation/statement_screen.dart';
import '../providers/navigation_provider.dart';
import '../widgets/success_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      if (state.matchedLocation == '/') {
        final prefs = await SharedPreferences.getInstance();
        if (prefs.getBool('onboarding_done') != true) {
          return '/hos-geldiniz';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/hos-geldiniz',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) {
          // '/?tab=0' veya sadece '/' geldiğinde Keşfet (index 0) sekmesini aç
          final tabParam = state.uri.queryParameters['tab'];
          if (tabParam != null) {
            final tabIndex = int.tryParse(tabParam) ?? 0;
            Future.microtask(() =>
              ref.read(selectedTabProvider.notifier).state = tabIndex);
          }
          return const MainShell();
        },
      ),
      GoRoute(
        path: '/giris-yap',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final returnTo = extra?['returnTo'] as String?;
          return LoginScreen(returnTo: returnTo);
        },
      ),
      GoRoute(
        path: '/kayit-ol',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/ilan-ver',
        builder: (context, state) => const PostJobScreen(),
      ),
      GoRoute(
        path: '/jetonlar',
        builder: (context, state) => const TokenScreen(),
      ),
      GoRoute(
        path: '/destek',
        builder: (context, state) => const SupportAgentScreen(),
      ),
      GoRoute(
        path: '/profil/:id',
        builder: (context, state) =>
            PublicProfileScreen(userId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/sablonlarim',
        builder: (context, state) => const JobTemplatesScreen(),
      ),
      GoRoute(
        path: '/aylik-beyan',
        builder: (context, state) => const StatementScreen(),
      ),
      GoRoute(
        path: '/ilan-basarili',
        builder: (context, state) => const SuccessScreen(
          title: 'İlanınız Yayında!',
          message: 'İlanınız başarıyla yayınlandı. Şimdi ustalardan teklif bekleyebilirsiniz.',
          btnText: "Keşfet'e Dön",
          targetRoute: '/',
          targetTab: 0,
        ),
      ),
    ],
  );
});
