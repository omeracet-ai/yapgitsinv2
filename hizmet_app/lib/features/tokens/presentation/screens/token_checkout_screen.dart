import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/token_repository.dart';

/// Phase 260 — Jeton satın alma iyzipay hosted Checkout Form WebView.
///
/// Serbest /tokens/purchase kaldırıldı; jeton satın alma artık YALNIZCA bu
/// ödeme akışından geçer. `createIyzipayCheckout` ile alınan paymentPageUrl
/// (yoksa checkoutFormContent) yüklenir. Callback URL'i yakalanınca
/// `confirmCheckout` çağrılır ve bakiye sunucuda kredilenir.
///
/// Başarı → Navigator.pop(true) (parent `tokenBalanceProvider`'ı invalidate eder).
class TokenCheckoutScreen extends ConsumerStatefulWidget {
  final String paymentToken;
  final String? paymentUrl;
  final String? formContent;

  const TokenCheckoutScreen({
    super.key,
    required this.paymentToken,
    this.paymentUrl,
    this.formContent,
  });

  @override
  ConsumerState<TokenCheckoutScreen> createState() =>
      _TokenCheckoutScreenState();
}

class _TokenCheckoutScreenState extends ConsumerState<TokenCheckoutScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _confirming = false;
  String? _error;

  static const _callbackPatterns = [
    'tokens/iyzipay/callback',
    'iyzipay/callback',
    'payment-success',
    'yapgitsin://payment-success',
  ];
  static const _failurePatterns = [
    'payment-failure',
    'yapgitsin://payment-failure',
  ];

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
          onWebResourceError: (e) => setState(() {
            _error = e.description;
            _loading = false;
          }),
          onNavigationRequest: (req) {
            final url = req.url.toLowerCase();
            if (_callbackPatterns.any(url.contains)) {
              _confirm();
              return NavigationDecision.prevent;
            }
            if (_failurePatterns.any(url.contains)) {
              if (mounted) Navigator.of(context).pop(false);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      );

    if (widget.paymentUrl != null && widget.paymentUrl!.isNotEmpty) {
      _controller.loadRequest(Uri.parse(widget.paymentUrl!));
    } else if (widget.formContent != null && widget.formContent!.isNotEmpty) {
      _controller.loadHtmlString(widget.formContent!);
    } else {
      _error = 'Ödeme sayfası başlatılamadı.';
      _loading = false;
    }
  }

  Future<void> _confirm() async {
    if (_confirming) return;
    setState(() => _confirming = true);
    try {
      final res = await ref
          .read(tokenRepositoryProvider)
          .confirmCheckout(widget.paymentToken);
      if (!mounted) return;
      final ok = res['status'] == 'success';
      Navigator.of(context).pop(ok);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _confirming = false;
        _error = 'Ödeme doğrulanamadı: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Güvenli Ödeme'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading || _confirming)
            const Center(child: CircularProgressIndicator()),
          if (_error != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: Material(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
