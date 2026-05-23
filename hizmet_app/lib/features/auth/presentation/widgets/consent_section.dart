import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import '../../../../core/theme/app_colors.dart';

/// Phase 256 — KVKK uyumluluk onay bölümü.
///
/// Kayıt formunun gönder butonunun ÜZERİNDE iki onay kutusu sunar:
///  - Zorunlu: KVKK Aydınlatma Metni + Kullanım Koşulları (bottom-sheet link).
///  - Opsiyonel: Pazarlama / kampanya bildirimleri.
///
/// Tek zorunlu kutu hem `kvkkConsent` hem `termsConsent` alanlarını set eder
/// (backend kontratı: kvkkConsent, termsConsent, marketingConsent, consentVersion).
class ConsentSection extends StatelessWidget {
  const ConsentSection({
    super.key,
    required this.mandatoryAccepted,
    required this.marketingAccepted,
    required this.onMandatoryChanged,
    required this.onMarketingChanged,
    this.showError = false,
  });

  /// Zorunlu onay (KVKK + Kullanım Koşulları) işaretli mi.
  final bool mandatoryAccepted;

  /// Opsiyonel pazarlama onayı işaretli mi.
  final bool marketingAccepted;

  final ValueChanged<bool> onMandatoryChanged;
  final ValueChanged<bool> onMarketingChanged;

  /// true ise zorunlu onay işaretlenmemiş hatasını gösterir.
  final bool showError;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Zorunlu: KVKK + Kullanım Koşulları ──────────────────────────────
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: showError && !mandatoryAccepted
                  ? AppColors.error
                  : (mandatoryAccepted ? AppColors.primary : AppColors.border),
            ),
          ),
          child: CheckboxListTile(
            value: mandatoryAccepted,
            onChanged: (v) => onMandatoryChanged(v ?? false),
            activeColor: AppColors.primary,
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: const EdgeInsets.symmetric(horizontal: 8),
            title: _MandatoryConsentText(
              onTapKvkk: () => _showLegalSheet(
                context,
                title: 'KVKK Aydınlatma Metni',
                assetPath: 'assets/legal/kvkk_v1.0.md',
              ),
              onTapTerms: () => _showLegalSheet(
                context,
                title: 'Kullanım Koşulları',
                assetPath: 'assets/legal/terms_v1.0.md',
              ),
            ),
          ),
        ),
        if (showError && !mandatoryAccepted) ...[
          const SizedBox(height: 6),
          const Padding(
            padding: EdgeInsets.only(left: 4),
            child: Row(
              children: [
                Icon(Icons.error_outline, size: 15, color: AppColors.error),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Devam etmek için KVKK metnini ve Kullanım Koşulları\'nı kabul etmelisiniz.',
                    style: TextStyle(fontSize: 12, color: AppColors.error),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 10),

        // ── Opsiyonel: Pazarlama bildirimleri ───────────────────────────────
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: marketingAccepted ? AppColors.primary : AppColors.border,
            ),
          ),
          child: CheckboxListTile(
            value: marketingAccepted,
            onChanged: (v) => onMarketingChanged(v ?? false),
            activeColor: AppColors.primary,
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: const EdgeInsets.symmetric(horizontal: 8),
            title: Text(
              'Pazarlama ve kampanya bildirimleri almak istiyorum.',
              style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
            ),
            subtitle: Text(
              'Opsiyonel — istediğiniz zaman ayarlardan kapatabilirsiniz.',
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ),
        ),
      ],
    );
  }

  /// Yasal metni modal bottom-sheet içinde scrollable + selectable gösterir.
  /// Markdown paketi pubspec'te yok → ham markdown SelectableText olarak
  /// render edilir. Asset bulunamazsa kısa placeholder gösterilir.
  Future<void> _showLegalSheet(
    BuildContext context, {
    required String title,
    required String assetPath,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _LegalSheet(title: title, assetPath: assetPath),
    );
  }
}

/// Zorunlu onay metni — KVKK ve Kullanım Koşulları tıklanabilir link olarak.
class _MandatoryConsentText extends StatelessWidget {
  const _MandatoryConsentText({
    required this.onTapKvkk,
    required this.onTapTerms,
  });

  final VoidCallback onTapKvkk;
  final VoidCallback onTapTerms;

  @override
  Widget build(BuildContext context) {
    const linkStyle = TextStyle(
      fontSize: 13,
      color: AppColors.primary,
      fontWeight: FontWeight.w600,
      decoration: TextDecoration.underline,
      decorationColor: AppColors.primary,
    );
    final baseStyle = TextStyle(fontSize: 13, color: AppColors.textPrimary);

    return Text.rich(
      TextSpan(
        style: baseStyle,
        children: [
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: GestureDetector(
              onTap: onTapKvkk,
              child: const Text("KVKK Aydınlatma Metni'ni", style: linkStyle),
            ),
          ),
          const TextSpan(text: ' ve '),
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: GestureDetector(
              onTap: onTapTerms,
              child: const Text("Kullanım Koşulları'nı", style: linkStyle),
            ),
          ),
          const TextSpan(text: ' okudum, kabul ediyorum.'),
        ],
      ),
    );
  }
}

/// Bottom-sheet gövdesi — asset'ten yasal metni yükler, scrollable gösterir.
class _LegalSheet extends StatelessWidget {
  const _LegalSheet({required this.title, required this.assetPath});

  final String title;
  final String assetPath;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: AppColors.textSecondary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: FutureBuilder<String>(
                future: _loadLegalText(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    );
                  }
                  final text = snapshot.data ?? '';
                  return SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                    child: SelectableText(
                      text,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  /// Asset'ten yasal metni yükler. Bulunamazsa kısa placeholder döner.
  Future<String> _loadLegalText() async {
    try {
      return await rootBundle.loadString(assetPath);
    } catch (_) {
      return 'Bu belge şu anda görüntülenemiyor. Lütfen daha sonra tekrar deneyin '
          'veya yapgitsin.com adresinden inceleyin.';
    }
  }
}
