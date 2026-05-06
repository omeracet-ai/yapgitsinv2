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
import '../providers/navigation_provider.dart';
import '../widgets/success_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      if (state.matchedLocation == '/') {
        final prefs = await SharedPreferences.getInstance();
        if (prefs.getBool('onboarding_done') != true) {
          return '/onboarding';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
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
        path: '/login',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final returnTo = extra?['returnTo'] as String?;
          return LoginScreen(returnTo: returnTo);
        },
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/post-job',
        builder: (context, state) => const PostJobScreen(),
      ),
      GoRoute(
        path: '/tokens',
        builder: (context, state) => const TokenScreen(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportAgentScreen(),
      ),
      GoRoute(
        path: '/profile/:id',
        builder: (context, state) =>
            PublicProfileScreen(userId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/job-success',
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
