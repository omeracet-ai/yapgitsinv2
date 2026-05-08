import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../features/onboarding/data/onboarding_storage.dart';
import '../../../features/home/presentation/screens/main_shell.dart';
import '../../../features/auth/presentation/screens/login_screen.dart';
import '../../../features/auth/presentation/screens/register_screen.dart';
import '../../../features/jobs/presentation/screens/post_job_screen.dart';
import '../../../features/tokens/presentation/screens/token_screen.dart';
import '../../../features/loyalty/presentation/screens/loyalty_screen.dart';
import '../../../features/subscriptions/presentation/screens/subscription_screen.dart';
import '../../../features/ai/presentation/screens/support_agent_screen.dart';
import '../../../features/ai/presentation/screens/ai_chat_screen.dart';
import '../../../features/auth/presentation/screens/public_profile_screen.dart';
import '../../../features/auth/presentation/screens/customer_public_profile_screen.dart';
import '../../../features/auth/presentation/screens/two_factor_challenge_screen.dart';
import '../../../features/auth/presentation/screens/two_factor_setup_screen.dart';
import '../../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../../features/auth/presentation/screens/verify_email_screen.dart';
import '../../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../../features/onboarding/presentation/screens/worker_onboarding_screen.dart';
import '../../../features/job_templates/presentation/job_templates_screen.dart';
import '../../../features/offers/presentation/screens/offer_templates_screen.dart';
import '../../../features/statements/presentation/statement_screen.dart';
import '../../../features/earnings/presentation/screens/earnings_screen.dart';
import '../../../features/users/presentation/screens/favorites_screen.dart';
import '../../../features/users/presentation/screens/blocked_users_screen.dart';
import '../../../features/jobs/presentation/screens/saved_jobs_screen.dart';
import '../../../features/notifications/presentation/screens/notification_preferences_screen.dart';
import '../../../features/bookings/presentation/screens/booking_create_screen.dart';
import '../../../features/disputes/presentation/screens/my_disputes_screen.dart';
import '../../../features/disputes/presentation/screens/dispute_create_screen.dart';
import '../providers/navigation_provider.dart';
import '../widgets/success_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      if (state.matchedLocation == '/') {
        if (!await OnboardingStorage.hasSeenOnboarding()) {
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
      // Phase 129 — Worker onboarding wizard (5-step).
      GoRoute(
        path: '/usta-baslangic',
        builder: (context, state) => const WorkerOnboardingScreen(),
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
        path: '/2fa-challenge',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return TwoFactorChallengeScreen(
            tempToken: (extra?['tempToken'] ?? '') as String,
            returnTo: extra?['returnTo'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/2fa-setup',
        builder: (context, state) => const TwoFactorSetupScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return ResetPasswordScreen(token: token);
        },
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final token = state.uri.queryParameters['token'] ?? '';
          return VerifyEmailScreen(token: token);
        },
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
        path: '/sadakat',
        builder: (context, state) => const LoyaltyScreen(),
      ),
      GoRoute(
        path: '/abonelik',
        builder: (context, state) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: '/kazanclarim',
        builder: (context, state) => const EarningsScreen(),
      ),
      GoRoute(
        path: '/destek',
        builder: (context, state) => const SupportAgentScreen(),
      ),
      GoRoute(
        path: '/asistan',
        builder: (context, state) => const AiChatScreen(),
      ),
      GoRoute(
        path: '/profil/:id',
        builder: (context, state) =>
            PublicProfileScreen(userId: state.pathParameters['id']!),
      ),
      // Phase 133 — Customer public profile (no worker fields).
      GoRoute(
        path: '/musteri/:id',
        builder: (context, state) => CustomerPublicProfileScreen(
          userId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/sablonlarim',
        builder: (context, state) => const JobTemplatesScreen(),
      ),
      GoRoute(
        path: '/teklif-sablonlarim',
        builder: (context, state) => const OfferTemplatesScreen(),
      ),
      GoRoute(
        path: '/aylik-beyan',
        builder: (context, state) => const StatementScreen(),
      ),
      GoRoute(
        path: '/favorilerim',
        builder: (context, state) => const FavoritesScreen(),
      ),
      GoRoute(
        path: '/engellenenler',
        builder: (context, state) => const BlockedUsersScreen(),
      ),
      GoRoute(
        path: '/kaydedilen-isler',
        builder: (context, state) => const SavedJobsScreen(),
      ),
      GoRoute(
        path: '/bildirim-ayarlari',
        builder: (context, state) => const NotificationPreferencesScreen(),
      ),
      GoRoute(
        path: '/randevu-olustur/:workerId',
        builder: (context, state) => buildBookingCreateRoute(state),
      ),
      GoRoute(
        path: '/sikayetlerim',
        builder: (context, state) => const MyDisputesScreen(),
      ),
      GoRoute(
        path: '/sikayet-olustur',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return DisputeCreateScreen(
            againstUserId: (extra['againstUserId'] ?? '') as String,
            jobId: extra['jobId'] as String?,
            bookingId: extra['bookingId'] as String?,
          );
        },
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
