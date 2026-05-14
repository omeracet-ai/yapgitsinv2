import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../../core/constants/api_constants.dart';
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
      return const Color(0xFF007DFE);
    }
  }

  factory _Slide.fromJson(Map<String, dynamic> j) => _Slide(
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        icon: Icons.home_repair_service,
        imageUrl: j['imageUrl'] as String?,
        gradientStart: _hex((j['gradientStart'] as String?) ?? '#007DFE'),
        gradientEnd: _hex((j['gradientEnd'] as String?) ?? '#0056B3'),
      );
}

// ─── Fallback slides (task spec) ─────────────────────────────────────────────

const _fallback = [
  _Slide(
    title: 'Usta Bul',
    body: 'Türkiye\'nin en iyi ustalarını keşfet',
    icon: Icons.search,
    gradientStart: Color(0xFF007DFE),
    gradientEnd: Color(0xFF0056B3),
  ),
  _Slide(
    title: 'Teklif Al',
    body: 'Ustalardan anlık teklif al, karşılaştır',
    icon: Icons.request_quote,
    gradientStart: Color(0xFF007DFE),
    gradientEnd: Color(0xFF0056B3),
  ),
  _Slide(
    title: 'İş Bitir',
    body: 'Güvenli ödeme, garantili hizmet',
    icon: Icons.check_circle_outline,
    gradientStart: Color(0xFF007DFE),
    gradientEnd: Color(0xFF0056B3),
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
        backgroundColor: Color(0xFF007DFE),
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctrl,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: _slides.length,
            itemBuilder: (_, i) => _PageBody(slide: _slides[i]),
          ),

          // Skip
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 20,
            child: TextButton(
              onPressed: _finish,
              child: const Text('Geç',
                  style: TextStyle(color: Colors.white70, fontSize: 14)),
            ),
          ),

          // Bottom controls
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 32,
            left: 32,
            right: 32,
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
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _next,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF007DFE),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: Text(
                      _page == _slides.length - 1 ? 'Başla' : 'Devam Et',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                if (_page == _slides.length - 1) ...[
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Zaten hesabın var mı?  ',
                          style: TextStyle(color: Colors.white70, fontSize: 13)),
                      GestureDetector(
                        onTap: () => context.push('/giris-yap'),
                        child: const Text('Giriş Yap',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                decoration: TextDecoration.underline,
                                decorationColor: Colors.white)),
                      ),
                    ],
                  ),
                ],
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
  const _PageBody({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [slide.gradientStart, slide.gradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(flex: 2),
              _illustration(),
              const Spacer(flex: 2),
              Text(
                slide.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  height: 1.15,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                slide.body,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                  height: 1.55,
                ),
              ),
              const Spacer(flex: 3),
            ],
          ),
        ),
      ),
    );
  }

  Widget _illustration() {
    if (slide.imageUrl != null) {
      return Container(
        width: 200,
        height: 200,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        clipBehavior: Clip.antiAlias,
        child: Image.network(
          slide.imageUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _iconCircle(),
        ),
      );
    }
    return _iconCircle();
  }

  Widget _iconCircle() => Container(
        width: 180,
        height: 180,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Icon(slide.icon, size: 80, color: Color(0xFF007DFE)),
        ),
      );
}
