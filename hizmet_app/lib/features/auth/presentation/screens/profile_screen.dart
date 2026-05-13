import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../wallet/presentation/screens/wallet_screen.dart' deferred as wallet_lib;
import '../../../../core/widgets/deferred_screen_loader.dart';
import '../../../tokens/data/token_repository.dart';
import '../../../currencies/presentation/currency_picker_sheet.dart';
import '../../../subscriptions/data/subscription_repository.dart';
import '../../../promo/widgets/promo_redeem_sheet.dart';
import '../providers/auth_provider.dart';
import '../../data/auth_repository.dart';
import 'personal_info_screen.dart';
import 'edit_profile_screen.dart';
import 'addresses_screen.dart';
import 'help_screen.dart';
import '../../../../core/constants/api_constants.dart';
import 'package:dio/dio.dart';
import '../../../calendar/presentation/calendar_screen.dart';
import '../../../calendar/presentation/earnings_screen.dart';
import '../../../profile/widgets/profile_completion_card.dart';
import '../../../profile/presentation/widgets/profile_video_uploader.dart';
import '../../widgets/availability_editor_sheet.dart';
import '../../../users/widgets/badge_row.dart';
import '../../../../core/theme/theme_mode_provider.dart';

// ── Provider: kendi profil verisini çeker (stats + yorumlar + fotoğraflar) ──
final myPublicProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return {};
  final userId = auth.user['id'] as String;
  final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
  final resp = await dio.get('/users/$userId/profile');
  return Map<String, dynamic>.from(resp.data as Map);
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    if (authState is! AuthAuthenticated) {
      return _buildGuestView(context);
    }

    final user = authState.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myPublicProfileProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              const ProfileCompletionCard(),
              _buildProfileHeader(user),
              ProfileVideoUploader(
                onUploadSuccess: () => ref.invalidate(myPublicProfileProvider),
              ),
              _buildTokenBanner(context, ref),
              _buildSubscriptionBanner(context, ref, user),
              _buildIdentityStatus(user),
              _buildEmailVerification(context, ref, user),
              _buildStatsSection(ref),
              _buildBadgesSection(ref),
              _buildPastPhotos(ref),
              _buildReviewsSection(ref),
              _buildMenuSection(context, ref),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGuestView(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text('Profil'), backgroundColor: AppColors.primary),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.account_circle_outlined,
                  size: 80, color: AppColors.textHint),
              const SizedBox(height: 24),
              const Text('Profilinizi görüntülemek için giriş yapın.',
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(fontSize: 16, color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/giris-yap'),
                  child: const Text('Giriş Yap'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader(Map<String, dynamic> user) {
    final name = user['fullName'] ?? 'Kullanıcı';
    final city = user['city'] as String?;
    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    return Consumer(
      builder: (context, ref, _) {
        final profileAsync = ref.watch(myPublicProfileProvider);
        final avgRating = profileAsync.maybeWhen(
          data: (p) => (p['averageRating'] as num?)?.toDouble() ?? 0.0,
          orElse: () => 0.0,
        );
        final repScore = profileAsync.maybeWhen(
          data: (p) => (p['reputationScore'] as num?)?.toInt() ?? 0,
          orElse: () => 0,
        );
        final totalReviews = profileAsync.maybeWhen(
          data: (p) => (p['totalReviews'] as num?)?.toInt() ?? 0,
          orElse: () => 0,
        );

        return Container(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
          decoration: const BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.white24,
                        child: Text(initials,
                            style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                      ),
                      if (avgRating >= 4.5)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: const BoxDecoration(
                                color: Colors.amber, shape: BoxShape.circle),
                            child: const Icon(Icons.star,
                                size: 14, color: Colors.white),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                        if (city != null && city.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(children: [
                            const Icon(Icons.location_on_outlined,
                                size: 13, color: Colors.white70),
                            const SizedBox(width: 4),
                            Text(city,
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 13)),
                          ]),
                        ],
                        const SizedBox(height: 6),
                        if (avgRating > 0)
                          Row(children: [
                            ...List.generate(
                                5,
                                (i) => Icon(
                                      i < avgRating.floor()
                                          ? Icons.star
                                          : (i < avgRating
                                              ? Icons.star_half
                                              : Icons.star_border),
                                      size: 14,
                                      color: Colors.amber.shade300,
                                    )),
                            const SizedBox(width: 4),
                            Text(
                                '${avgRating.toStringAsFixed(1)} ($totalReviews yorum)',
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 12)),
                          ])
                        else
                          const Text('Henüz değerlendirme yok',
                              style: TextStyle(
                                  color: Colors.white54, fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: Colors.white),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const EditProfileScreen()),
                    ).then((_) =>
                        ref.invalidate(profileCompletionProvider)),
                  ),
                ],
              ),
              if (repScore > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _headerStat('🏆', '$repScore', 'İtibar Puanı'),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _headerStat(
                          '⭐', avgRating.toStringAsFixed(1), 'Ortalama Puan'),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _headerStat('📝', '$totalReviews', 'Değerlendirme'),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _headerStat(String emoji, String value, String label) {
    return Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 16)),
      const SizedBox(height: 2),
      Text(value,
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
    ]);
  }

  Widget _buildIdentityStatus(Map<String, dynamic> user) {
    final hasIdentity = user['identityPhotoUrl'] != null;
    final isVerified = user['identityVerified'] == true;

    final Color bgColor;
    final Color borderColor;
    final IconData icon;
    final String title;
    final String subtitle;

    if (isVerified) {
      bgColor = Colors.green.shade50;
      borderColor = Colors.green.shade300;
      icon = Icons.verified_user;
      title = 'Kimlik Doğrulandı';
      subtitle = 'Hesabınız onaylıdır.';
    } else if (hasIdentity) {
      bgColor = Colors.orange.shade50;
      borderColor = Colors.orange.shade300;
      icon = Icons.hourglass_empty;
      title = 'Kimlik İnceleniyor';
      subtitle = 'Doğrulama süreci devam ediyor.';
    } else {
      bgColor = Colors.red.shade50;
      borderColor = Colors.red.shade300;
      icon = Icons.warning_amber_outlined;
      title = 'Kimlik Yüklenmedi';
      subtitle = 'Güven için kimlik fotoğrafı yükleyin.';
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor)),
      child: Row(children: [
        Icon(icon, color: borderColor, size: 24),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  TextStyle(fontWeight: FontWeight.bold, color: borderColor)),
          Text(subtitle,
              style: TextStyle(
                  fontSize: 12, color: borderColor.withValues(alpha: 0.8))),
        ]),
      ]),
    );
  }

  Widget _buildEmailVerification(
      BuildContext context, WidgetRef ref, Map<String, dynamic> user) {
    final email = user['email'] as String?;
    if (email == null || email.isEmpty) return const SizedBox.shrink();
    final verified = user['emailVerified'] == true;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          const Icon(Icons.email_outlined, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(email,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                if (verified)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.check_circle,
                          color: Colors.green, size: 14),
                      const SizedBox(width: 4),
                      Text('Doğrulanmış',
                          style: TextStyle(
                              color: Colors.green.shade700,
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ]),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('Doğrulanmadı',
                        style: TextStyle(
                            color: Colors.amber.shade800,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),
          if (!verified)
            TextButton(
              onPressed: () => _requestEmailVerification(context, ref),
              child: const Text('Doğrula'),
            ),
        ],
      ),
    );
  }

  Future<void> _requestEmailVerification(
      BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res = await ref.read(authRepositoryProvider).requestEmailVerification();
      final url = res['verifyUrl'] as String?;
      if (!context.mounted) return;
      if (url == null || url.isEmpty) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Doğrulama bağlantısı email ile gönderildi')));
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Email Doğrulama'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                  'SMTP henüz aktif değil — bağlantıyı manuel açın',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 12),
              const Text('Doğrulama bağlantısı:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SelectableText(url, style: const TextStyle(fontSize: 12)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                      content: Text('Bağlantı kopyalandı')));
                }
              },
              child: const Text('Kopyala'),
            ),
            TextButton(
              onPressed: () async {
                final uri = Uri.tryParse(url);
                if (uri != null) {
                  await launchUrl(uri,
                      mode: LaunchMode.externalApplication);
                }
              },
              child: const Text('Tarayıcıda Aç'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Kapat'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Widget _buildTokenBanner(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    return GestureDetector(
      onTap: () => context.push('/jetonlar'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          const Icon(Icons.toll_rounded, color: Colors.white, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Sanal Token Bakiyesi',
                  style: TextStyle(color: Colors.white70, fontSize: 12)),
              balanceAsync.when(
                data: (b) => Text('$b Token',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                loading: () => const Text('...',
                    style: TextStyle(color: Colors.white, fontSize: 18)),
                error: (_, __) => const Text('--',
                    style: TextStyle(color: Colors.white, fontSize: 18)),
              ),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
                color: Colors.white24, borderRadius: BorderRadius.circular(20)),
            child: const Text('Yükle',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13)),
          ),
        ]),
      ),
    );
  }

  Widget _buildSubscriptionBanner(
      BuildContext context, WidgetRef ref, Map<String, dynamic> user) {
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) return const SizedBox.shrink();
    final myAsync = ref.watch(mySubscriptionProvider);
    return GestureDetector(
      onTap: () => context.push('/abonelik'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [AppColors.accent, Color(0xFFFFB800)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          const Icon(Icons.workspace_premium, color: Colors.white, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: myAsync.when(
              data: (sub) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sub != null && sub.isActive
                          ? '✓ ${sub.plan.name}'
                          : 'Premium Üyelik',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                    Text(
                      sub != null && sub.isActive
                          ? 'Sınırsız teklif aktif'
                          : 'Sınırsız teklif & Pro özellikler',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12),
                    ),
                  ]),
              loading: () => const Text('...',
                  style: TextStyle(color: Colors.white)),
              error: (_, __) => const Text('Premium Üyelik',
                  style: TextStyle(color: Colors.white)),
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white),
        ]),
      ),
    );
  }

  // ── İstatistikler ──────────────────────────────────────────────────────────
  Widget _buildStatsSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('İstatistikler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          profileAsync.when(
            loading: () => const Center(
                child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(strokeWidth: 2))),
            error: (_, __) => const SizedBox.shrink(),
            data: (profile) {
              if (profile.isEmpty) return const SizedBox.shrink();
              final cTotal = (profile['asCustomerTotal'] ?? 0) as int;
              final cSuccess = (profile['asCustomerSuccess'] ?? 0) as int;
              final cFail = (profile['asCustomerFail'] ?? 0) as int;
              final wTotal = (profile['asWorkerTotal'] ?? 0) as int;
              final wSuccess = (profile['asWorkerSuccess'] ?? 0) as int;
              final wFail = (profile['asWorkerFail'] ?? 0) as int;

              return Row(
                children: [
                  Expanded(
                    child: _statCard(
                      icon: Icons.shopping_bag_outlined,
                      color: Colors.blue,
                      title: 'Hizmet Alan',
                      total: cTotal,
                      success: cSuccess,
                      fail: cFail,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      icon: Icons.handyman_outlined,
                      color: Colors.green,
                      title: 'Hizmet Veren',
                      total: wTotal,
                      success: wSuccess,
                      fail: wFail,
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _statCard({
    required IconData icon,
    required Color color,
    required String title,
    required int total,
    required int success,
    required int fail,
  }) {
    final rate = total > 0 ? (success / total * 100).round() : 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(title,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ]),
          const SizedBox(height: 12),
          Text('$rate%',
              style: TextStyle(
                  fontSize: 28, fontWeight: FontWeight.bold, color: color)),
          const Text('başarı oranı',
              style: TextStyle(fontSize: 11, color: AppColors.textHint)),
          const SizedBox(height: 10),
          _statRow('Toplam', total, Colors.grey.shade700),
          const SizedBox(height: 2),
          _statRow('Başarılı', success, Colors.green.shade600),
          const SizedBox(height: 2),
          _statRow('Başarısız', fail, Colors.red.shade400),
          if (total > 0) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? success / total : 0,
                backgroundColor: Colors.red.shade100,
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statRow(String label, int value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        Text('$value',
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  // ── Rozetlerim ────────────────────────────────────────────────────────────
  Widget _buildBadgesSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);
    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        final badges = data['badges'] as List?;
        if (badges == null || badges.isEmpty) return const SizedBox.shrink();
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Rozetlerim',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              BadgeRow(badges: badges),
            ],
          ),
        );
      },
    );
  }

  // ── Geçmiş İş Fotoğrafları (4 adet) ───────────────────────────────────────
  Widget _buildPastPhotos(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (profile) {
        final photos = List<String>.from(profile['pastPhotos'] ?? []);
        if (photos.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Geçmiş İşlerden',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('${photos.length} fotoğraf',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textHint)),
                ],
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: photos.length.clamp(0, 4),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.1,
                ),
                itemBuilder: (ctx, i) => _photoTile(photos[i]),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _photoTile(String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          color: Colors.grey.shade200,
          child: const Icon(Icons.image_not_supported_outlined,
              color: AppColors.textHint),
        ),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return Container(
            color: Colors.grey.shade100,
            child:
                const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        },
      ),
    );
  }

  // ── Değerlendirmeler ───────────────────────────────────────────────────────
  Widget _buildReviewsSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (profile) {
        final reviews =
            List<Map<String, dynamic>>.from(profile['reviews'] ?? []);
        final avg = (profile['averageRating'] ?? 0.0) as num;
        final total = (profile['totalReviews'] ?? 0) as int;

        if (reviews.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Text('Değerlendirmeler',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Icon(Icons.star, size: 16, color: Colors.amber.shade600),
                const SizedBox(width: 2),
                Text('${avg.toStringAsFixed(1)} ($total)',
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
              ]),
              const SizedBox(height: 12),
              ...reviews.take(5).map((r) => _reviewCard(r)),
            ],
          ),
        );
      },
    );
  }

  Widget _reviewCard(Map<String, dynamic> r) {
    final reviewer = r['reviewer'] as Map<String, dynamic>? ?? {};
    final name = reviewer['fullName'] ?? 'Kullanıcı';
    final rating = (r['rating'] ?? 0) as int;
    final comment = r['comment'] as String? ?? '';
    final createdAt = r['createdAt'] as String? ?? '';

    String timeAgo = '';
    if (createdAt.isNotEmpty) {
      final d = DateTime.tryParse(createdAt);
      if (d != null) {
        final diff = DateTime.now().difference(d).inDays;
        timeAgo = diff == 0
            ? 'Bugün'
            : diff == 1
                ? 'Dün'
                : '$diff gün önce';
      }
    }

    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              child: Text(initials,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    if (timeAgo.isNotEmpty)
                      Text(timeAgo,
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textHint)),
                  ]),
            ),
            Row(
              children: List.generate(
                5,
                (i) => Icon(
                  i < rating ? Icons.star : Icons.star_border,
                  size: 14,
                  color: Colors.amber.shade600,
                ),
              ),
            ),
          ]),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(comment,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          _menuItem(Icons.person_outline, 'Kişisel Bilgiler', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
          }),
          _menuItem(Icons.account_balance_wallet_outlined, 'Cüzdanım', () {
            Navigator.push(context,
                MaterialPageRoute(
                  builder: (_) => DeferredScreenLoader(
                    loader: wallet_lib.loadLibrary,
                    builder: () => wallet_lib.WalletScreen(),
                  ),
                ));
          }),
          _menuItem(Icons.calendar_month_outlined, 'İş Takvimi', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const CalendarScreen()));
          }),
          _menuItem(Icons.event_available_outlined, 'Müsaitlik Programı', () {
            final auth = ref.read(authStateProvider);
            final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
            final raw = user['availabilitySchedule'];
            Map<String, bool>? initial;
            if (raw is Map) {
              initial = raw.map((k, v) => MapEntry(k.toString(), v == true));
            }
            AvailabilityEditorSheet.show(context, initial: initial);
          }),
          ..._buildWorkerOnlyItems(context, ref),
          ..._buildCustomerOnlyItems(context, ref),
          _menuItem(Icons.card_giftcard_rounded, '🎁 Arkadaş Davet', () {
            context.push('/sadakat');
          }),
          _menuItem(Icons.confirmation_number_outlined,
              '🎟️ Promosyon Kodu Kullan', () {
            PromoRedeemSheet.show(context);
          }),
          _menuItem(Icons.payments_outlined, 'Kazançlarım', () {
            context.push('/kazanclarim');
          }),
          _menuItem(Icons.history_outlined, 'İşlem Geçmişi', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const EarningsScreen()));
          }),
          _menuItem(Icons.receipt_long_outlined, 'Aylık Beyan', () {
            context.push('/aylik-beyan');
          }),
          _menuItem(Icons.favorite_outline, 'Favorilerim', () {
            context.push('/favorilerim');
          }),
          _menuItem(Icons.block_outlined, 'Engellenenler', () {
            context.push('/engellenenler');
          }),
          _menuItem(Icons.bookmark_border_rounded, 'Kaydedilen İşler', () {
            context.push('/kaydedilen-isler');
          }),
          _menuItem(Icons.flag_outlined, '🚩 Şikayetlerim', () {
            context.push('/sikayetlerim');
          }),
          _menuItem(Icons.notifications_outlined, 'Bildirim Ayarları', () {
            context.push('/bildirim-ayarlari');
          }),
          _menuItem(Icons.notifications_active_outlined, '🔔 Kategori Abonelikleri', () {
            context.push('/kategori-abonelikleri');
          }),
          _menuItem(Icons.attach_money_rounded, '💱 Para Birimi', () {
            CurrencyPickerSheet.show(context);
          }),
          _menuItem(Icons.location_on_outlined, 'Adreslerim', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AddressesScreen()));
          }),
          _menuItem(Icons.payment_outlined, 'Ödeme Yöntemleri', () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Ödeme yönetimi yakında eklenecek.')),
            );
          }),
          _build2FAMenuItem(context, ref),
          _buildAppearanceItem(context, ref),
          _menuItem(Icons.help_outline, 'Yardım & Destek', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const HelpScreen()));
          }),
          _menuItem(Icons.smart_toy_outlined, '🤖 Yapgitsin Asistan',
              () => context.push('/asistan')),
          const Divider(height: 1, indent: 50),
          _menuItem(Icons.download_outlined, '📥 Verilerimi İndir (KVKK)',
              () => _handleDataExport(context, ref)),
          _menuItem(Icons.privacy_tip_outlined,
              '🗑️ Hesap Verilerimi Sil (KVKK)',
              () => _showDataDeletionDialog(context, ref),
              color: AppColors.error),
          const Divider(height: 1, indent: 50),
          _menuItem(Icons.logout, 'Çıkış Yap',
              () => ref.read(authStateProvider.notifier).logout(),
              color: Colors.redAccent),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showDeleteAccountDialog(context, ref),
                icon: const Icon(Icons.delete_forever, color: AppColors.error),
                label: const Text(
                  'Hesabı Sil',
                  style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDataExport(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('Verileriniz hazırlanıyor...')),
    );
    try {
      final body = await ref.read(authRepositoryProvider).downloadDataExport();
      if (!context.mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
              '✅ Verileriniz hazır (${(body.length / 1024).toStringAsFixed(1)} KB). KVKK Madde 11.'),
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      messenger.showSnackBar(SnackBar(content: Text('Hata: $msg')));
    }
  }

  Future<void> _showDataDeletionDialog(
      BuildContext context, WidgetRef ref) async {
    final reasonCtrl = TextEditingController();
    bool busy = false;
    String? errorText;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Row(
            children: [
              Icon(Icons.privacy_tip_outlined, color: AppColors.error),
              SizedBox(width: 8),
              Expanded(child: Text('Veri Silme Talebi (KVKK)')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'KVKK Madde 11 gereği tüm verilerinizin silinmesini talep edebilirsiniz. '
                'Talep yöneticilerimizce 30 gün içinde değerlendirilir.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                enabled: !busy,
                maxLines: 3,
                maxLength: 500,
                decoration: InputDecoration(
                  labelText: 'Sebep (opsiyonel)',
                  errorText: errorText,
                  border: const OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.of(dialogCtx).pop(),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              onPressed: busy
                  ? null
                  : () async {
                      setState(() {
                        busy = true;
                        errorText = null;
                      });
                      try {
                        await ref
                            .read(authRepositoryProvider)
                            .requestDataDeletion(reasonCtrl.text.trim());
                        if (!ctx.mounted) return;
                        Navigator.of(dialogCtx).pop();
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                '✅ Silme talebiniz alındı. 30 gün içinde değerlendirilecek.'),
                          ),
                        );
                      } catch (e) {
                        final msg =
                            e.toString().replaceFirst('Exception: ', '');
                        setState(() {
                          busy = false;
                          errorText = msg;
                        });
                      }
                    },
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Talep Gönder'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDeleteAccountDialog(BuildContext context, WidgetRef ref) async {
    final passwordCtrl = TextEditingController();
    bool obscure = true;
    bool busy = false;
    String? errorText;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.error),
              SizedBox(width: 8),
              Expanded(child: Text('Hesabı Sil')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '⚠️ Hesabınız silinecek. Bu işlem geri alınamaz. Devam için şifrenizi girin.',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: passwordCtrl,
                obscureText: obscure,
                enabled: !busy,
                decoration: InputDecoration(
                  labelText: 'Şifre',
                  errorText: errorText,
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(obscure ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => obscure = !obscure),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.of(dialogCtx).pop(),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              onPressed: busy
                  ? null
                  : () async {
                      final pw = passwordCtrl.text;
                      if (pw.isEmpty) {
                        setState(() => errorText = 'Şifrenizi girin');
                        return;
                      }
                      setState(() {
                        busy = true;
                        errorText = null;
                      });
                      try {
                        await ref.read(authRepositoryProvider).deleteAccount(pw);
                        if (!ctx.mounted) return;
                        Navigator.of(dialogCtx).pop();
                        await ref.read(authStateProvider.notifier).logout();
                        if (!context.mounted) return;
                        context.go('/login');
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Hesap silindi')),
                        );
                      } catch (e) {
                        final msg = e.toString().replaceFirst('Exception: ', '');
                        setState(() {
                          busy = false;
                          errorText = msg;
                        });
                      }
                    },
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Hesabı Sil'),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildWorkerOnlyItems(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) return const [];
    return [
      _menuItem(Icons.note_alt_outlined, 'Teklif Şablonlarım', () {
        context.push('/teklif-sablonlarim');
      }),
      _menuItem(Icons.rocket_launch_rounded, '🚀 Hızlı Boost', () {
        context.push('/boost');
      }),
      _menuItem(Icons.calendar_month_outlined, '📅 Takvim Senkronizasyonu', () {
        context.push('/takvim-sync');
      }),
    ];
  }

  /// Phase 138 — customer (or general) sees message templates entry.
  /// Shown when user is not a worker (workerCategories empty/missing).
  List<Widget> _buildCustomerOnlyItems(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (isWorker) return const [];
    return [
      _menuItem(Icons.chat_bubble_outline, '💬 Mesaj Şablonlarım', () {
        context.push('/mesaj-sablonlarim');
      }),
    ];
  }

  Widget _build2FAMenuItem(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final enabled = user['twoFactorEnabled'] == true;

    return ListTile(
      leading: Icon(
        enabled ? Icons.verified_user : Icons.security_outlined,
        color: enabled ? Colors.green : AppColors.textPrimary,
        size: 22,
      ),
      title: const Text('İki Adımlı Doğrulama',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      subtitle: Text(
        enabled ? 'Açık' : 'Kapalı',
        style: TextStyle(
            fontSize: 12,
            color: enabled ? Colors.green : AppColors.textHint,
            fontWeight: FontWeight.w600),
      ),
      trailing:
          const Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: () async {
        if (!enabled) {
          final result = await context.push<bool>('/2fa-setup');
          if (result == true) {
            ref.read(authStateProvider.notifier)
                .updateUserData({'twoFactorEnabled': true});
          }
        } else {
          await _confirmDisable(context, ref);
        }
      },
    );
  }

  Future<void> _confirmDisable(BuildContext context, WidgetRef ref) async {
    final codeController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('2FA Devre Dışı Bırak'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
                'Devre dışı bırakmak için authenticator uygulamanızdaki kodu girin:'),
            const SizedBox(height: 12),
            TextField(
              controller: codeController,
              autofocus: true,
              maxLength: 6,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontFamily: 'monospace', fontSize: 20, letterSpacing: 6),
              decoration: const InputDecoration(
                  counterText: '', hintText: '······'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('İptal')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Devre Dışı Bırak',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (ok != true) return;
    final code = codeController.text.trim();
    if (code.length != 6) return;

    try {
      await ref.read(authRepositoryProvider).disable2FA(code);
      ref.read(authStateProvider.notifier)
          .updateUserData({'twoFactorEnabled': false});
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('2FA devre dışı bırakıldı'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildAppearanceItem(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return ListTile(
      leading: const Icon(Icons.brightness_6_outlined,
          color: AppColors.textPrimary, size: 22),
      title: const Text('Görünüm',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      subtitle: Text(themeModeLabel(mode),
          style: const TextStyle(
              fontSize: 12,
              color: AppColors.textHint,
              fontWeight: FontWeight.w600)),
      trailing:
          const Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: () => _showAppearanceSheet(context, ref),
    );
  }

  void _showAppearanceSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) {
        return Consumer(builder: (ctx, ref2, _) {
          final current = ref2.watch(themeModeProvider);
          Widget tile(ThemeMode m, String label, IconData icon) {
            return RadioListTile<ThemeMode>(
              value: m,
              // ignore: deprecated_member_use
              groupValue: current,
              title: Text(label),
              secondary: Icon(icon),
              // ignore: deprecated_member_use
              onChanged: (v) async {
                if (v == null) return;
                await ref2.read(themeModeProvider.notifier).setMode(v);
                if (ctx.mounted) Navigator.pop(ctx);
              },
            );
          }

          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Görünüm',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
                tile(ThemeMode.system, 'Sistem', Icons.settings_suggest_outlined),
                tile(ThemeMode.light, 'Açık', Icons.light_mode_outlined),
                tile(ThemeMode.dark, 'Koyu', Icons.dark_mode_outlined),
                const SizedBox(height: 8),
              ],
            ),
          );
        });
      },
    );
  }

  Widget _menuItem(IconData icon, String title, VoidCallback onTap,
      {Color? color}) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppColors.textPrimary, size: 22),
      title: Text(title,
          style: TextStyle(
              color: color ?? AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      trailing:
          const Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: onTap,
    );
  }
}
