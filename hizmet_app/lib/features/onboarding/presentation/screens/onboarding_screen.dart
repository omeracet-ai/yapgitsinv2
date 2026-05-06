import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _ctrl = PageController();
  int _page = 0;

  static const _pages = [
    _OPage(
      emoji: '🛠️',
      title: 'Usta Bul,\nHizmet Al',
      body: 'Temizlik, tadilat, tesisattan nakliyata kadar '
          'binlerce doğrulanmış usta tek platformda.',
      gradient: [Color(0xFF007DFE), Color(0xFF0056B3)],
    ),
    _OPage(
      emoji: '🔒',
      title: 'Güvenli &\nHızlı',
      body: 'Kimlik doğrulamalı ustalar, şeffaf fiyatlar '
          've güvenli ödeme sistemi ile içiniz rahat.',
      gradient: [Color(0xFF2D3E50), Color(0xFF1a2530)],
    ),
    _OPage(
      emoji: '⭐',
      title: 'İlan Ver,\nTeklif Al',
      body: 'İhtiyacınızı ilan olarak paylaşın, uygun ustalar '
          'size teklif getirsin — tamamen ücretsiz.',
      gradient: [Color(0xFF00C9A7), Color(0xFF008f75)],
    ),
  ];

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    if (mounted) context.go('/');
  }

  void _next() {
    if (_page < _pages.length - 1) {
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
    return Scaffold(
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctrl,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: _pages.length,
            itemBuilder: (_, i) => _PageBody(page: _pages[i]),
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
                    _pages.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: i == _page ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color:
                            i == _page ? Colors.white : Colors.white.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Next / Start button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _next,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: _pages[_page].gradient.first,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: Text(
                      _page == _pages.length - 1 ? 'Başla' : 'Devam Et',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                if (_page == _pages.length - 1) ...[
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

class _PageBody extends StatelessWidget {
  final _OPage page;
  const _PageBody({required this.page});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: page.gradient,
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
              // Illustration container
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(page.emoji,
                      style: const TextStyle(fontSize: 80)),
                ),
              ),
              const Spacer(flex: 2),
              Text(
                page.title,
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
                page.body,
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
}

class _OPage {
  final String emoji;
  final String title;
  final String body;
  final List<Color> gradient;
  const _OPage(
      {required this.emoji,
      required this.title,
      required this.body,
      required this.gradient});
}
