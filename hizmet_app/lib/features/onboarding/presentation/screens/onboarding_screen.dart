import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../../../../core/constants/api_constants.dart';

// ─── Model ────────────────────────────────────────────────────────────────────

class _Slide {
  final String title;
  final String body;
  final String? emoji;
  final String? imageUrl;
  final Color gradientStart;
  final Color gradientEnd;

  const _Slide({
    required this.title,
    required this.body,
    this.emoji,
    this.imageUrl,
    required this.gradientStart,
    required this.gradientEnd,
  });

  static Color _hex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  factory _Slide.fromJson(Map<String, dynamic> j) => _Slide(
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        emoji: j['emoji'] as String?,
        imageUrl: j['imageUrl'] as String?,
        gradientStart: _hex((j['gradientStart'] as String?) ?? '#007DFE'),
        gradientEnd: _hex((j['gradientEnd'] as String?) ?? '#0056B3'),
      );
}

// ─── Fallback (API'ye ulaşamazsa) ────────────────────────────────────────────

const _fallback = [
  _Slide(
    title: 'Usta Bul,\nHizmet Al',
    body: 'Temizlik, tadilat, tesisattan nakliyata kadar '
        'binlerce doğrulanmış usta tek platformda.',
    emoji: '🛠️',
    gradientStart: Color(0xFF007DFE),
    gradientEnd: Color(0xFF0056B3),
  ),
  _Slide(
    title: 'Güvenli &\nHızlı',
    body: 'Kimlik doğrulamalı ustalar, şeffaf fiyatlar '
        've güvenli ödeme sistemi ile içiniz rahat.',
    emoji: '🔒',
    gradientStart: Color(0xFF2D3E50),
    gradientEnd: Color(0xFF1a2530),
  ),
  _Slide(
    title: 'İlan Ver,\nTeklif Al',
    body: 'İhtiyacınızı ilan olarak paylaşın, uygun ustalar '
        'size teklif getirsin — tamamen ücretsiz.',
    emoji: '⭐',
    gradientStart: Color(0xFF00C9A7),
    gradientEnd: Color(0xFF008f75),
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
      debugPrint('Onboarding: Veriler çekiliyor... URL: ${ApiConstants.baseUrl}/onboarding-slides');
      final dio = Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));
      final res = await dio.get('/onboarding-slides');
      
      // Veri direkt liste mi yoksa 'data' alanı içinde mi?
      final List rawList;
      if (res.data is List) {
        rawList = res.data as List;
      } else if (res.data is Map && res.data['data'] is List) {
        rawList = res.data['data'] as List;
      } else {
        throw Exception('Geçersiz veri formatı: ${res.data.runtimeType}');
      }

      final slides = rawList.map((e) {
        final j = e as Map<String, dynamic>;
        // Emülatör erişimi için localhost -> 10.0.2.2 dönüşümü (Android ise)
        String? img = j['imageUrl'] as String?;
        if (img != null && !kIsWeb && Platform.isAndroid) {
          img = img.replaceFirst('localhost', '10.0.2.2');
        }
        
        return _Slide.fromJson({
          ...j,
          'imageUrl': img,
        });
      }).where((s) => s.title.isNotEmpty).toList();

      if (slides.isNotEmpty && mounted) {
        debugPrint('Onboarding: ${slides.length} slide başarıyla yüklendi.');
        setState(() => _slides = slides);
      } else {
        debugPrint('Onboarding: Backendden boş liste geldi, fallback kullanılıyor.');
      }
    } catch (e, stack) {
      debugPrint('Onboarding Error: $e');
      debugPrint('Stack: $stack');
      // fallback kullan
    } finally {
      if (mounted) setState(() => _loadingSlides = false);
    }
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
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
                // Dots
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
                      foregroundColor: _slides[_page].gradientStart,
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
                        onTap: () => context.push('/login'),
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
                  fontSize: 34,
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
          errorBuilder: (_, __, ___) => _emojiCircle(),
        ),
      );
    }
    return _emojiCircle();
  }

  Widget _emojiCircle() => Container(
        width: 180,
        height: 180,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text(slide.emoji ?? '✨',
              style: const TextStyle(fontSize: 80)),
        ),
      );
}
