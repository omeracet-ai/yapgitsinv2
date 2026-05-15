import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/job_status_badge.dart';
import '../../data/onboarding_storage.dart';


// ─── Model ────────────────────────────────────────────────────────────────────

class _Slide {
  final String title;
  final String body;
  final IconData icon;
  final String? imageUrl;
  final Color gradientStart;
  final Color gradientEnd;

  const _Slide({
    required this.title,
    required this.body,
    required this.icon,
    this.imageUrl,
    required this.gradientStart,
    required this.gradientEnd,
  });

  static Color _hex(String hex) {
    try {
      final h = hex.replaceAll('#', '').padLeft(6, '0').substring(0, 6);
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return AppColors.primary;
    }
  }

  factory _Slide.fromJson(Map<String, dynamic> j) => _Slide(
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        icon: Icons.home_repair_service,
        imageUrl: j['imageUrl'] as String?,
        gradientStart: _hex((j['gradientStart'] as String?) ?? '#0C1117'),
        gradientEnd: _hex((j['gradientEnd'] as String?) ?? '#161B22'),
      );
}

// ─── Fallback slides (Match temp1.jpg) ─────────────────────────────────────────────

const _fallback = [
  _Slide(
    title: 'Bir işin mi var?\nBu gece\nbiri yapsın.',
    body: 'Türkiye, Azerbaycan, Kıbrıs ve Özbekistan\'da binlerce güvenilir profesyonele saniyeler içinde ulaş.',
    icon: Icons.flash_on,
    gradientStart: Color(0xFF0C1117),
    gradientEnd: Color(0xFF161B22),
  ),
  _Slide(
    title: 'Usta bul,\nteklif al,\nrahat et.',
    body: 'İşini yayınla, dakikalar içinde en uygun teklifleri değerlendirmeye başla.',
    icon: Icons.search,
    gradientStart: Color(0xFF0C1117),
    gradientEnd: Color(0xFF161B22),
  ),
  _Slide(
    title: 'Paran emanette,\nrahat ol,\nödeme güvenli.',
    body: 'İş bitmeden paran güvende kalsın. Memnuniyet garantisi ile ödemeni onayla.',
    icon: Icons.security,
    gradientStart: Color(0xFF0C1117),
    gradientEnd: Color(0xFF161B22),
  ),
];


// ─── Screen ───────────────────────────────────────────────────────────────────

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _ctrl = PageController();
  int _page = 0;
  List<_Slide> _slides = _fallback;
  bool _loadingSlides = true;

  @override
  void initState() {
    super.initState();
    _fetchSlides();
  }

  Future<void> _fetchSlides() async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));
      final res = await dio.get('/onboarding-slides');

      final List rawList;
      if (res.data is List) {
        rawList = res.data as List;
      } else if (res.data is Map && res.data['data'] is List) {
        rawList = res.data['data'] as List;
      } else {
        throw Exception('Invalid format');
      }

      String? _fixUrl(String? img) {
        if (img == null) return null;
        // Android emulator: localhost → 10.0.2.2 (without dart:io Platform)
        if (!kIsWeb) {
          img = img.replaceFirst('localhost', '10.0.2.2');
        }
        return img;
      }

      final slides = rawList.map((e) {
        final j = e as Map<String, dynamic>;
        return _Slide.fromJson({...j, 'imageUrl': _fixUrl(j['imageUrl'] as String?)});
      }).where((s) => s.title.isNotEmpty).toList();

      if (slides.isNotEmpty && mounted) {
        setState(() => _slides = slides);
      }
    } catch (_) {
      // fallback kullan
    } finally {
      if (mounted) setState(() => _loadingSlides = false);
    }
  }

  Future<void> _finish() async {
    await OnboardingStorage.markSeen();
    if (mounted) context.go('/');
  }

  void _next() {
    if (_page < _slides.length - 1) {
      _ctrl.nextPage(
          duration: const Duration(milliseconds: 350), curve: Curves.easeInOut);
    } else {
      _finish();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingSlides) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctrl,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: _slides.length,
            itemBuilder: (_, i) => _PageBody(
              slide: _slides[i],
              isFirst: i == 0,
            ),
          ),

          // Top bar — Y logo + Skip
          Positioned(
            top: MediaQuery.of(context).padding.top + 14,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text(
                          'Y',
                          style: GoogleFonts.playfairDisplay(
                            color: Colors.black,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'yapgitsin.',
                      style: GoogleFonts.inter(
                        color: AppColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: _finish,
                  child: Text(
                    'Geç',
                    style: GoogleFonts.inter(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom controls
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 24,
            left: 24,
            right: 24,
            child: Column(
              children: [
                // Dot indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    _slides.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: i == _page ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: i == _page
                            ? AppColors.primary
                            : AppColors.border,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Primary CTA — Hemen başla (pill 28)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _next,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _page == _slides.length - 1 ? 'Hemen başla' : 'Devam Et',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_rounded,
                            color: Colors.black, size: 20),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Secondary — Tasker olarak gel (outlined)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton(
                    onPressed: () => context.push('/giris-yap',
                        extra: {'returnTo': '/profil/usta-ol'}),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      backgroundColor: AppColors.surface,
                      side: const BorderSide(
                          color: AppColors.border, width: 1),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28)),
                    ),
                    child: Text(
                      'Tasker olarak gel',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Hesabın var mı? ',
                        style: GoogleFonts.inter(
                            color: AppColors.textSecondary, fontSize: 13)),
                    GestureDetector(
                      onTap: () => context.push('/giris-yap'),
                      child: Text(
                        'Giriş yap',
                        style: GoogleFonts.inter(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Sayfa içeriği ────────────────────────────────────────────────────────────

class _PageBody extends StatelessWidget {
  final _Slide slide;
  final bool isFirst;
  const _PageBody({required this.slide, this.isFirst = false});

  /// Render title with italic Playfair accent on the middle phrase.
  /// Splits at `\n` and italicizes the second line (e.g. "Bu gece").
  Widget _buildTitle(BuildContext context) {
    final parts = slide.title.split('\n');
    if (parts.length < 2) {
      return Text(
        slide.title,
        textAlign: TextAlign.left,
        style: GoogleFonts.playfairDisplay(
          color: AppColors.textPrimary,
          fontSize: 38,
          fontWeight: FontWeight.w800,
          height: 1.05,
          letterSpacing: -0.5,
        ),
      );
    }
    // 3-line title: line1, italic-accent, line3 (fallback to line2)
    final line1 = parts[0];
    final accent = parts[1];
    final line3 = parts.length > 2 ? parts[2] : null;
    return RichText(
      textAlign: TextAlign.left,
      text: TextSpan(
        style: GoogleFonts.playfairDisplay(
          color: AppColors.textPrimary,
          fontSize: 38,
          fontWeight: FontWeight.w800,
          height: 1.1,
          letterSpacing: -0.5,
        ),
        children: [
          TextSpan(text: '$line1\n'),
          TextSpan(
            text: accent,
            style: GoogleFonts.playfairDisplay(
              color: AppColors.primary,
              fontSize: 38,
              fontStyle: FontStyle.italic,
              fontWeight: FontWeight.w700,
              height: 1.1,
            ),
          ),
          if (line3 != null) TextSpan(text: '\n$line3'),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 64),
              const Spacer(flex: 3),
              if (isFirst) ...[
                const OnlineCountBadge(text: '12.483 usta şu an çevrimiçi'),
                const SizedBox(height: 24),
              ],
              _buildTitle(context),
              const SizedBox(height: 20),
              Text(
                slide.body,
                textAlign: TextAlign.left,
                style: GoogleFonts.inter(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                  height: 1.55,
                ),
              ),
              const Spacer(flex: 4),
              const SizedBox(height: 200),
            ],
          ),
        ),
      ),
    );
  }
}
