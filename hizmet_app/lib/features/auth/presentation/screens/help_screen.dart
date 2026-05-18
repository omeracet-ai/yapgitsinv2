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
      'Teklif nasÄ±l veririm?',
      'YaptÄ±r ekranÄ±ndan bir ilanÄ± seÃ§in, "Teklif Ver" butonuna tÄ±klayÄ±n, fiyatÄ±nÄ±zÄ± ve mesajÄ±nÄ±zÄ± girin. '
      'Teklif mÃ¼ÅŸteriye iletilir; kabul, ret veya pazarlÄ±k teklifi alabilirsiniz.',
    ),
    (
      'Kimlik doÄŸrulama neden gerekli?',
      'Mavi tik (âœ“) kazanmak iÃ§in kimlik fotoÄŸrafÄ±nÄ±zÄ± yÃ¼klemeniz gerekir. '
      'DoÄŸrulanmÄ±ÅŸ hesaplar daha fazla gÃ¼ven oluÅŸturur ve Ã¶ne Ã§Ä±kar. '
      'Kimlik bilgileriniz ÅŸifreli olarak saklanÄ±r, Ã¼Ã§Ã¼ncÃ¼ taraflarla paylaÅŸÄ±lmaz.',
    ),
    (
      'Yeterlilik Belgesi nedir?',
      'UzmanlÄ±k alanÄ±nÄ±za ait sertifika, diploma veya belgeleri yÃ¼kleyebilirsiniz. '
      'Onaylanan belgeler profilinizde "BelgelenmiÅŸ Uzman" rozeti olarak gÃ¶rÃ¼nÃ¼r.',
    ),
    (
      'Teklif fiyatÄ± baÅŸkasÄ± gÃ¶rebilir mi?',
      'HayÄ±r. Teklif tutarÄ± yalnÄ±zca ilan sahibi ve teklifi veren kiÅŸi tarafÄ±ndan gÃ¶rÃ¼lebilir. '
      'DiÄŸer kullanÄ±cÄ±lara tutar gizlenir.',
    ),
    (
      'Ã–deme nasÄ±l yapÄ±lÄ±r?',
      'Ã–deme ilan sahibi ile usta arasÄ±nda doÄŸrudan gerÃ§ekleÅŸir. '
      'Platform ÅŸu an iÃ§in Ã¶deme aracÄ±lÄ±k hizmeti sunmamaktadÄ±r. '
      'GÃ¼venli Ã¶deme iÃ§in iÅŸ tamamlandÄ±ktan sonra Ã¶deme yapmanÄ±zÄ± Ã¶neririz.',
    ),
    (
      'DeÄŸerlendirme nasÄ±l bÄ±rakÄ±rÄ±m?',
      'Ä°ÅŸ tamamlandÄ±ktan sonra ilan detay ekranÄ±ndaki kabul edilmiÅŸ teklif kartÄ±nda '
      '"DeÄŸerlendir" butonuna tÄ±klayÄ±n. 1-5 yÄ±ldÄ±z ve yorum bÄ±rakabilirsiniz.',
    ),
    (
      'HesabÄ±mÄ± nasÄ±l silerim?',
      'Hesap silme iÅŸlemi iÃ§in support@yapgitsin.tr adresine e-posta gÃ¶nderiniz. '
      'Talebiniz 5 iÅŸ gÃ¼nÃ¼ iÃ§inde iÅŸleme alÄ±nÄ±r.',
    ),
    (
      'Teklif verirken hata alÄ±yorum?',
      'Token bakiyenizin yeterli olduÄŸundan emin olun. '
      'Her teklif belirli miktarda token gerektirir. '
      'Sorun devam ederse destek ekibimizle iletiÅŸime geÃ§in.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('YardÄ±m & Destek'),
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
                    decoration: BoxDecoration(color: AppColors.surface.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.support_agent_rounded, size: 40, color: Colors.white),
                  ),
                  const SizedBox(height: 14),
                  const Text('Size nasÄ±l yardÄ±mcÄ± olabiliriz?',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('AÅŸaÄŸÄ±dan sÄ±kÃ§a sorulan sorularÄ± inceleyebilir\nveya bize doÄŸrudan ulaÅŸabilirsiniz.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // HÄ±zlÄ± iletiÅŸim butonlarÄ±
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(child: _contactCard(
                    icon: Icons.email_outlined,
                    label: 'E-posta',
                    sub: 'support@yapgitsin.tr',
                    color: Colors.blue,
                    onTap: () => _launchUrl('mailto:support@yapgitsin.tr'),
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
                label: 'AI Destek AsistanÄ±',
                sub: '7/24 anÄ±nda yanÄ±t',
                color: AppColors.primary,
                onTap: () => context.push('/destek'),
                full: true,
              ),
            ),

            const SizedBox(height: 28),

            // SSS baÅŸlÄ±k
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Row(children: [
                Icon(Icons.quiz_outlined, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text('SÄ±kÃ§a Sorulan Sorular',
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
                decoration: BoxDecoration(color: AppColors.surface,
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
                    const Text('Uygulama hakkÄ±ndaki gÃ¶rÃ¼ÅŸleriniz bizim iÃ§in deÄŸerli.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    const SizedBox(height: 14),
                    OutlinedButton.icon(
                      onPressed: () => _launchUrl('mailto:geri-bildirim@yapgitsin.tr?subject=Uygulama%20Geri%20Bildirimi'),
                      icon: const Icon(Icons.send_outlined, size: 16),
                      label: const Text('Geri Bildirim GÃ¶nder'),
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
                  _textLink('Gizlilik PolitikasÄ±', () => _launchUrl('https://yapgitsin.tr/privacy')),
                  const Text(' Â· ', style: TextStyle(color: AppColors.textHint)),
                  _textLink('KullanÄ±m KoÅŸullarÄ±', () => _launchUrl('https://yapgitsin.tr/terms')),
                  const Text(' Â· ', style: TextStyle(color: AppColors.textHint)),
                  _textLink('Ã‡erez PolitikasÄ±', () => _launchUrl('https://yapgitsin.tr/cookies')),
                ],
              ),
            ),

            const SizedBox(height: 8),
            const Center(
              child: Text('Hizmet UygulamasÄ± v1.0.0',
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
        decoration: BoxDecoration(color: AppColors.surface,
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
