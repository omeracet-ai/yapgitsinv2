import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_colors.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  int? _expandedFaq;

  static const _faqs = [
    (
      'Teklif nasıl veririm?',
      'Keşfet ekranından bir ilanı seçin, "Teklif Ver" butonuna tıklayın, fiyatınızı ve mesajınızı girin. '
      'Teklif müşteriye iletilir; kabul, ret veya pazarlık teklifi alabilirsiniz.',
    ),
    (
      'Kimlik doğrulama neden gerekli?',
      'Mavi tik (✓) kazanmak için kimlik fotoğrafınızı yüklemeniz gerekir. '
      'Doğrulanmış hesaplar daha fazla güven oluşturur ve öne çıkar. '
      'Kimlik bilgileriniz şifreli olarak saklanır, üçüncü taraflarla paylaşılmaz.',
    ),
    (
      'Yeterlilik Belgesi nedir?',
      'Uzmanlık alanınıza ait sertifika, diploma veya belgeleri yükleyebilirsiniz. '
      'Onaylanan belgeler profilinizde "Belgelenmiş Uzman" rozeti olarak görünür.',
    ),
    (
      'Teklif fiyatı başkası görebilir mi?',
      'Hayır. Teklif tutarı yalnızca ilan sahibi ve teklifi veren kişi tarafından görülebilir. '
      'Diğer kullanıcılara tutar gizlenir.',
    ),
    (
      'Ödeme nasıl yapılır?',
      'Ödeme ilan sahibi ile usta arasında doğrudan gerçekleşir. '
      'Platform şu an için ödeme aracılık hizmeti sunmamaktadır. '
      'Güvenli ödeme için iş tamamlandıktan sonra ödeme yapmanızı öneririz.',
    ),
    (
      'Değerlendirme nasıl bırakırım?',
      'İş tamamlandıktan sonra ilan detay ekranındaki kabul edilmiş teklif kartında '
      '"Değerlendir" butonuna tıklayın. 1-5 yıldız ve yorum bırakabilirsiniz.',
    ),
    (
      'Hesabımı nasıl silerim?',
      'Hesap silme işlemi için destek@hizmet.app adresine e-posta gönderiniz. '
      'Talebiniz 5 iş günü içinde işleme alınır.',
    ),
    (
      'Teklif verirken hata alıyorum?',
      'Token bakiyenizin yeterli olduğundan emin olun. '
      'Her teklif belirli miktarda token gerektirir. '
      'Sorun devam ederse destek ekibimizle iletişime geçin.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Yardım & Destek'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Hero banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.support_agent_rounded, size: 40, color: Colors.white),
                  ),
                  const SizedBox(height: 14),
                  const Text('Size nasıl yardımcı olabiliriz?',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('Aşağıdan sıkça sorulan soruları inceleyebilir\nveya bize doğrudan ulaşabilirsiniz.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Hızlı iletişim butonları
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(child: _contactCard(
                    icon: Icons.email_outlined,
                    label: 'E-posta',
                    sub: 'destek@hizmet.app',
                    color: Colors.blue,
                    onTap: () => _launchUrl('mailto:destek@hizmet.app'),
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: _contactCard(
                    icon: Icons.phone_outlined,
                    label: 'Telefon',
                    sub: '0850 123 4567',
                    color: Colors.green,
                    onTap: () => _launchUrl('tel:+908501234567'),
                  )),
                ],
              ),
            ),

            const SizedBox(height: 8),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _contactCard(
                icon: Icons.smart_toy_outlined,
                label: 'AI Destek Asistanı',
                sub: '7/24 anında yanıt',
                color: AppColors.primary,
                onTap: () => context.push('/destek'),
                full: true,
              ),
            ),

            const SizedBox(height: 28),

            // SSS başlık
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Row(children: [
                Icon(Icons.quiz_outlined, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text('Sıkça Sorulan Sorular',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
              ]),
            ),
            const SizedBox(height: 12),

            // FAQ accordion
            ...List.generate(_faqs.length, (i) {
              final (q, a) = _faqs[i];
              final expanded = _expandedFaq == i;
              return Container(
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: expanded ? AppColors.primary.withValues(alpha: 0.4) : AppColors.border,
                  ),
                  boxShadow: expanded
                      ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.06),
                          blurRadius: 8, offset: const Offset(0, 2))]
                      : [],
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => setState(() => _expandedFaq = expanded ? null : i),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                            child: Text(q,
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: expanded ? AppColors.primary : AppColors.textPrimary)),
                          ),
                          Icon(
                            expanded ? Icons.expand_less : Icons.expand_more,
                            color: expanded ? AppColors.primary : AppColors.textHint,
                          ),
                        ]),
                        if (expanded) ...[
                          const SizedBox(height: 10),
                          const Divider(height: 1),
                          const SizedBox(height: 10),
                          Text(a,
                              style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.6)),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 24),

            // Geri bildirim
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary.withValues(alpha: 0.08),
                             AppColors.primary.withValues(alpha: 0.03)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(children: [
                      Icon(Icons.feedback_outlined, color: AppColors.primary, size: 20),
                      SizedBox(width: 8),
                      Text('Geri Bildirim', style: TextStyle(
                          fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ]),
                    const SizedBox(height: 8),
                    const Text('Uygulama hakkındaki görüşleriniz bizim için değerli.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    const SizedBox(height: 14),
                    OutlinedButton.icon(
                      onPressed: () => _launchUrl('mailto:geri-bildirim@hizmet.app?subject=Uygulama%20Geri%20Bildirimi'),
                      icon: const Icon(Icons.send_outlined, size: 16),
                      label: const Text('Geri Bildirim Gönder'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Yasal
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _textLink('Gizlilik Politikası', () => _launchUrl('https://hizmet.app/privacy')),
                  const Text(' · ', style: TextStyle(color: AppColors.textHint)),
                  _textLink('Kullanım Koşulları', () => _launchUrl('https://hizmet.app/terms')),
                  const Text(' · ', style: TextStyle(color: AppColors.textHint)),
                  _textLink('Çerez Politikası', () => _launchUrl('https://hizmet.app/cookies')),
                ],
              ),
            ),

            const SizedBox(height: 8),
            const Center(
              child: Text('Hizmet Uygulaması v1.0.0',
                  style: TextStyle(fontSize: 11, color: AppColors.textHint)),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _contactCard({
    required IconData icon,
    required String label,
    required String sub,
    required Color color,
    required VoidCallback onTap,
    bool full = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: full ? double.infinity : null,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(fontWeight: FontWeight.bold,
                          fontSize: 13, color: AppColors.textPrimary)),
                  Text(sub,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: color.withValues(alpha: 0.6)),
          ],
        ),
      ),
    );
  }

  Widget _textLink(String text, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Text(text,
          style: const TextStyle(fontSize: 11, color: AppColors.primary,
              decoration: TextDecoration.underline)),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
}
