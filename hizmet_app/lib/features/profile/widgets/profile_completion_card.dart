import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../auth/presentation/screens/edit_profile_screen.dart';
import '../data/user_profile_repository.dart';

// Phase 353 — Popup-shown bayrağını widget tree ile share et. Bool
// FutureProvider; tek seferlik popup gösterilmişse "Profil Tamamlandı"
// kalıcı pill'i de gizlenir (user uyarısı zaten gösterildi).
const String kProfileCompletePopupKey = 'profile_complete_popup_shown';

final profileCompletePopupShownProvider =
    FutureProvider.autoDispose<bool>((ref) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(kProfileCompletePopupKey) ?? false;
  } catch (_) {
    return false;
  }
});

// Phase 48 — Profile Completion Banner.
// Backend contract: GET /users/me returns
//   profileCompletion: { percent, missingFields[], totalFields, filledFields }

const Map<String, String> kProfileFieldLabels = {
  'fullName': 'Ad Soyad',
  'phoneNumber': 'Telefon',
  'email': 'E-posta',
  'profileImageUrl': 'Profil Fotoğrafı',
  'identityPhotoUrl': 'Kimlik Fotoğrafı',
  'identityVerified': 'Kimlik Doğrulama',
  'birthDate': 'Doğum Tarihi',
  'gender': 'Cinsiyet',
  'city': 'Şehir',
  'district': 'İlçe',
  'address': 'Adres',
  'workerCategories': 'Hizmet Kategorileri',
  'workerBio': 'Hakkında',
  'hourlyRateMin': 'Saatlik Ücret (Min)',
  'hourlyRateMax': 'Saatlik Ücret (Max)',
  // Phase 425 — isAvailable + availabilitySchedule profil doluluk
  // sayımından çıkarıldı (backend de aynı). Label mapping defensive
  // amaçla kaldı.
  'isAvailable': 'Müsaitlik Durumu',
  'availabilitySchedule': 'Çalışma Saatleri',
  'serviceRadiusKm': 'Hizmet Yarıçapı',
};

String labelForField(String key) => kProfileFieldLabels[key] ?? key;

// Phase 426 — Defansif filter: backend Phase 425'te availability/isAvailable
// alanlarını profil doluluk hesabından kaldırdı. Ancak APK cache'i veya eski
// backend response'ları kullanıcıya hâlâ "Müsaitlik Durumu eksik" gösterebilir
// — bu set Flutter tarafında o anahtarları zorla temizler ve percent'i
// kalan alanlar üzerinden yeniden hesaplar.
const Set<String> kCompletionExcludedKeys = {
  'isAvailable',
  'availabilitySchedule',
};

final profileCompletionProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return {};
  try {
    final body = await ref.read(userProfileRepositoryProvider).getMe();
    final pc = body['profileCompletion'];
    if (pc is! Map) return {};
    final map = Map<String, dynamic>.from(pc);

    // missingFields filter — availability anahtarlarını UI'dan gizle.
    final rawMissing = (map['missingFields'] as List?) ?? const [];
    final filteredMissing = rawMissing
        .map((e) => e.toString())
        .where((k) => !kCompletionExcludedKeys.contains(k))
        .toList();

    // Eğer backend hâlâ filtered olmayan totalFields gönderiyorsa
    // (eski cache), totalFields ve percent'i yeniden hesapla.
    final totalFromBackend = (map['totalFields'] as num?)?.toInt() ?? 0;
    final filledFromBackend = (map['filledFields'] as num?)?.toInt() ?? 0;
    final removedFromMissing = rawMissing.length - filteredMissing.length;
    // Backend missing'de availability tutmuş → totalFields'tan da düş.
    final totalFields = (totalFromBackend - removedFromMissing).clamp(1, 999);
    final filledFields = filledFromBackend.clamp(0, totalFields);
    final percent = ((filledFields / totalFields) * 100).round();

    map['missingFields'] = filteredMissing;
    map['totalFields'] = totalFields;
    map['filledFields'] = filledFields;
    map['percent'] = percent;
    return map;
  } catch (_) {
    return {};
  }
});

class ProfileCompletionCard extends ConsumerWidget {
  const ProfileCompletionCard({super.key});

  Color _barColor(int percent) {
    if (percent >= 100) return AppColors.success;
    if (percent >= 80) return AppColors.primary;
    if (percent >= 50) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(profileCompletionProvider);
    return async.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        if (data.isEmpty) return const SizedBox.shrink();
        final percent = (data['percent'] as num?)?.toInt() ?? 0;
        final missingRaw = (data['missingFields'] as List?) ?? const [];
        final missing = missingRaw.map((e) => e.toString()).toList();
        if (percent >= 100) {
          // Phase 353 — Popup bir kere gösterildiyse kalıcı uyarıyı gizle;
          // hero card zaten dark renge geçerek complete state'i gösteriyor.
          final popupShownAsync =
              ref.watch(profileCompletePopupShownProvider);
          final popupShown = popupShownAsync.maybeWhen(
            data: (v) => v,
            orElse: () => false,
          );
          if (popupShown) return const SizedBox.shrink();
          return _buildComplete();
        }
        return _buildIncomplete(context, ref, percent, missing);
      },
    );
  }

  Widget _buildComplete() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
        ),
        child: const Row(
          children: [
            Icon(Icons.verified, color: AppColors.success, size: 20),
            SizedBox(width: 8),
            Text(
              'Profil Tamamlandı',
              style: TextStyle(
                color: AppColors.success,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIncomplete(
    BuildContext context,
    WidgetRef ref,
    int percent,
    List<String> missing,
  ) {
    final color = _barColor(percent);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.12),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Profilini %$percent tamamla',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '%$percent',
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: (percent / 100.0).clamp(0.0, 1.0),
                minHeight: 8,
                backgroundColor: color.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              missing.isEmpty
                  ? 'Az kaldı, devam et!'
                  : '${missing.length} alan eksik',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (missing.isNotEmpty) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () =>
                          _showMissingSheet(context, ref, missing),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: color,
                        side: BorderSide(color: color),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('Detay'),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _goEdit(context, ref),
                    icon: const Icon(Icons.edit, size: 18),
                    label: const Text('Tamamla'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: color,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _goEdit(BuildContext context, WidgetRef ref) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const EditProfileScreen()),
    ).then((_) => ref.invalidate(profileCompletionProvider));
  }

  void _showMissingSheet(
    BuildContext context,
    WidgetRef ref,
    List<String> missing,
  ) {
    showModalBottomSheet(
      useSafeArea: true,
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.checklist_rtl, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Eksik Alanlar (${missing.length})',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: SingleChildScrollView(
                  child: Column(
                    children: missing.map((key) {
                      return ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.radio_button_unchecked,
                            color: AppColors.error, size: 20),
                        title: Text(
                          labelForField(key),
                          style: TextStyle(
                            fontWeight: FontWeight.w500,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _goEdit(context, ref);
                  },
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('Profili Düzenle'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
