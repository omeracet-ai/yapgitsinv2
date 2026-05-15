import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_subscription_repository.dart';

/// Phase 188 — Iyzipay hosted Checkout Form WebView.
///
/// Loads the iyzipay paymentPageUrl. We intercept navigation for:
///   - any URL containing `iyzipay/callback`  → success path, call /confirm
///   - any URL containing `payment-success`   → success path
///   - any URL containing `payment-failure`   → cancel
///   - app deep-link scheme `yapgitsin://`    → close
///
/// On confirm() success, we Navigator.pop(true) so the parent screen knows
/// to invalidate `mySubscriptionProvider`.
class IyzipayCheckoutScreen extends ConsumerStatefulWidget {
  final String paymentUrl;
  final String paymentToken;
  const IyzipayCheckoutScreen({
    super.key,
    required this.paymentUrl,
    required this.paymentToken,
  });

  @override
  ConsumerState<IyzipayCheckoutScreen> createState() =>
      _IyzipayCheckoutScreenState();
}

class _IyzipayCheckoutScreenState
    extends ConsumerState<IyzipayCheckoutScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _confirming = false;
  String? _error;

  static const _callbackPatterns = [
    'iyzipay/callback',
    'payments/iyzipay/callback',
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
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  Future<void> _confirm() async {
    if (_confirming) return;
    setState(() => _confirming = true);
    try {
      await ref
          .read(subscriptionRepositoryProvider)
          .confirm(widget.paymentToken);
      if (!mounted) return;
      Navigator.of(context).pop(true);
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
        title: const Text('Ödeme'),
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
