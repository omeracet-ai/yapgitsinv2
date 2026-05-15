import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../features/onboarding/data/onboarding_storage.dart';
import '../../../features/home/presentation/screens/main_shell.dart';
import '../../../features/auth/presentation/screens/login_screen.dart';
import '../../../features/auth/presentation/screens/register_screen.dart';
import '../../../features/jobs/presentation/screens/post_job_screen.dart';
import '../../../features/jobs/presentation/screens/job_detail_screen.dart';
import '../../../features/jobs/data/job_repository.dart';
import '../../../features/jobs/presentation/providers/job_provider.dart';
import '../../../features/chat/presentation/screens/chat_detail_screen.dart';
import '../../../features/tokens/presentation/screens/token_screen.dart';
import '../../../features/loyalty/presentation/screens/loyalty_screen.dart';
import '../../../features/subscriptions/presentation/screens/subscription_screen.dart';
import '../../../features/subscriptions/presentation/screens/category_subscriptions_screen.dart';
import '../../../features/boost/presentation/screens/boost_screen.dart';
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
import '../../../features/messaging/presentation/screens/message_templates_screen.dart';
import '../../../features/statements/presentation/statement_screen.dart';
import '../../../features/earnings/presentation/screens/earnings_screen.dart';
import '../../../features/calendar/presentation/screens/calendar_sync_screen.dart';
import '../../../features/users/presentation/screens/favorites_screen.dart';
import '../../../features/users/presentation/screens/blocked_users_screen.dart';
import '../../../features/jobs/presentation/screens/saved_jobs_screen.dart';
import '../../../features/notifications/presentation/screens/notification_preferences_screen.dart';
import '../../../features/bookings/presentation/screens/booking_create_screen.dart';
import '../../../features/disputes/presentation/screens/my_disputes_screen.dart';
import '../../../features/disputes/presentation/screens/dispute_create_screen.dart';
import '../../../features/certifications/presentation/certifications_screen.dart';
import '../../../features/photos/presentation/screens/portfolio_screen.dart';
import '../../../features/map/presentation/screens/map_screen.dart';
import '../providers/navigation_provider.dart';
import '../widgets/success_screen.dart';
import '../widgets/splash_screen.dart';
import '../../../features/escrow/presentation/screens/payment_screen.dart';
import '../../../features/escrow/presentation/screens/escrow_list_screen.dart';
import '../../../features/promo/presentation/screens/promo_screen.dart';

/// Public path'ler — auth gerektirmez. `startsWith` ile değil tam eşleşme veya
/// prefix ile kontrol edilir (kategori listeleri vs. eklenirse buraya).
const _publicPaths = <String>{
  '/splash',
  '/hos-geldiniz',
  '/usta-baslangic',
  '/',
  '/giris-yap',
  '/kayit-ol',
  '/2fa-challenge',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/destek',
  '/harita',
};

/// Public prefix'ler — `/profil/:id`, `/musteri/:id`, `/usta/:id`, `/ilan/:id`
/// deep link'leri logged-out kullanıcılar da görebilsin (paylaşım/sosyal).
const _publicPrefixes = <String>[
  '/profil/',
  '/musteri/',
  '/usta/',
  '/ilan/',
];

/// Auth zorunlu prefix'ler. Match olmayan + public olmayan path'ler de
/// güvenlik gereği protected sayılır (deny-by-default).
const _protectedPrefixes = <String>[
  '/ilan-ver',
  '/jetonlar',
  '/promo',
  '/sadakat',
  '/abonelik',
  '/kategori-abonelikleri',
  '/boost',
  '/kazanclarim',
  '/takvim-sync',
  '/asistan',
  '/sablonlarim',
  '/teklif-sablonlarim',
  '/sertifikalarim',
  '/mesaj-sablonlarim',
  '/aylik-beyan',
  '/favorilerim',
  '/engellenenler',
  '/kaydedilen-isler',
  '/bildirim-ayarlari',
  '/randevu-olustur',
  '/sikayetlerim',
  '/sikayet-olustur',
  '/chat',
  '/odeme',
  '/escrow-listesi',
  '/portfolyo',
  '/ilan-basarili',
  '/2fa-setup',
];

// ignore: unused_element
bool _isPublic(String loc) {
  if (_publicPaths.contains(loc)) return true;
  for (final p in _publicPrefixes) {
    if (loc.startsWith(p)) return true;
  }
  return false;
}

bool _isProtected(String loc) {
  for (final p in _protectedPrefixes) {
    if (loc == p || loc.startsWith('$p/') || loc.startsWith('$p?')) return true;
  }
  return false;
}

final routerProvider = Provider<GoRouter>((ref) {
  // Auth state değiştiğinde router refresh — login/logout flicker'ı önler.
  final refresh = _AuthRefreshNotifier();
  ref.listen<AuthState>(authStateProvider, (_, __) => refresh.bump());
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      // Auth henüz çözülmediyse splash'ta bırak — flicker'ı önler.
      if (authState is AuthInitial || authState is AuthLoading) {
        return null;
      }
      final isAuthed = authState is AuthAuthenticated;
      final loc = state.matchedLocation;

      // Auth bekleyen kullanıcı protected path'e gittiyse login'e yönlendir,
      // dönüş hedefi query string'de saklanır.
      if (!isAuthed && _isProtected(loc)) {
        final returnTo = Uri.encodeComponent(loc);
        return '/giris-yap?returnTo=$returnTo';
      }

      // Logged-in kullanıcı login/register/forgot sayfalarına gitmesin.
      if (isAuthed &&
          (loc == '/giris-yap' ||
              loc == '/kayit-ol' ||
              loc == '/forgot-password' ||
              loc == '/2fa-challenge')) {
        return '/';
      }

      return null; // no redirect
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
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
          // '/?tab=0' veya sadece '/' geldiğinde Yaptır (index 0) sekmesini aç
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
        path: '/promo',
        builder: (context, state) => const PromoScreen(),
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
        path: '/kategori-abonelikleri',
        builder: (context, state) => const CategorySubscriptionsScreen(),
      ),
      GoRoute(
        path: '/boost',
        builder: (context, state) => const BoostScreen(),
      ),
      GoRoute(
        path: '/kazanclarim',
        builder: (context, state) => const EarningsScreen(),
      ),
      GoRoute(
        path: '/takvim-sync',
        builder: (context, state) => const CalendarSyncScreen(),
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
        path: '/sertifikalarim',
        builder: (context, state) => const CertificationsScreen(),
      ),
      GoRoute(
        path: '/mesaj-sablonlarim',
        builder: (context, state) => const MessageTemplatesScreen(),
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
      // Phase 215 — Deep link routes (yapgitsin://usta/:id, yapgitsin://ilan/:id, yapgitsin://chat/:roomId)
      GoRoute(
        path: '/usta/:id',
        builder: (context, state) =>
            PublicProfileScreen(userId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/ilan/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return _IlanDetailLoader(jobId: id);
        },
      ),
      GoRoute(
        path: '/chat/:roomId',
        builder: (context, state) {
          final roomId = state.pathParameters['roomId']!;
          return ChatDetailScreen(peerName: roomId, peerId: roomId);
        },
      ),
      GoRoute(
        path: '/harita',
        builder: (context, state) => const MapScreen(),
      ),
      GoRoute(
        path: '/odeme/:jobId',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          final extra = state.extra as Map<String, dynamic>? ?? {};
          final amount = (extra['amount'] as num?)?.toDouble() ?? 0.0;
          return PaymentScreen(jobId: jobId, amount: amount);
        },
      ),
      GoRoute(
        path: '/escrow-listesi',
        builder: (context, state) => const EscrowListScreen(),
      ),
      GoRoute(
        path: '/portfolyo',
        builder: (context, state) => const PortfolioScreen(),
      ),
      GoRoute(
        path: '/ilan-basarili',
        builder: (context, state) => const SuccessScreen(
          title: 'İlanınız Yayında!',
          message: 'İlanınız başarıyla yayınlandı. Şimdi ustalardan teklif bekleyebilirsiniz.',
          btnText: "Yaptır'a Dön",
          targetRoute: '/',
          targetTab: 0,
        ),
      ),
    ],
  );
});

/// GoRouter refresh helper — Riverpod auth state değişimlerini
/// `ChangeNotifier` API'sine bağlar.
class _AuthRefreshNotifier extends ChangeNotifier {
  void bump() => notifyListeners();
}

/// Loader widget for /ilan/:id deep-link route.
/// Fetches job data via [jobDetailProvider] and renders [JobDetailScreen].
class _IlanDetailLoader extends ConsumerWidget {
  final String jobId;
  const _IlanDetailLoader({required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(jobDetailProvider(jobId));
    return async.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('İlan yüklenemedi: $e')),
      ),
      data: (map) {
        final job = Job.fromMap(map);
        return JobDetailScreen(
          id: job.id,
          title: job.title,
          description: job.description ?? job.desc,
          location: job.location,
          budget: job.budget,
          category: job.category,
          postedAt: job.time,
          icon: Job.getIconForCategory(job.category),
          color: Job.getColorForCategory(job.category),
          isFeatured: job.isFeatured,
          customerId: job.customerId,
          photos: job.photos ?? const [],
        );
      },
    );
  }
}
