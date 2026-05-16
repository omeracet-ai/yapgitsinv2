import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../data/payment_repository.dart';
import '../../domain/buyer_info.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class IyzicoPaymentScreen extends ConsumerStatefulWidget {
  final double amount;

  /// Phase 248 — opsiyonel buyer payload. Null geçilirse screen önce
  /// `authStateProvider`'dan currentUser'ı BuyerInfo'ya map etmeyi dener;
  /// auth state Authenticated değilse `user` field'ı tamamen omit edilir
  /// (backend fallback devreye girer — Phase 245).
  final BuyerInfo? buyer;

  const IyzicoPaymentScreen({super.key, required this.amount, this.buyer});

  @override
  ConsumerState<IyzicoPaymentScreen> createState() => _IyzicoPaymentScreenState();
}

class _IyzicoPaymentScreenState extends ConsumerState<IyzicoPaymentScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  String? _htmlContent;

  @override
  void initState() {
    super.initState();
    _fetchPaymentForm();
  }

  Future<void> _fetchPaymentForm() async {
    try {
      // Phase 248 — buyer çözümü: explicit param > authStateProvider > null.
      // TODO(phase-248-wire): call-site'lar BuyerInfo'yu explicit geçmeye
      // başlayınca bu otomatik auth-state fallback'i kaldırılabilir.
      BuyerInfo? buyer = widget.buyer;
      if (buyer == null) {
        final auth = ref.read(authStateProvider);
        if (auth is AuthAuthenticated) {
          buyer = BuyerInfo.fromAuthUser(auth.user);
        }
      }

      // Phase 244 — raw Dio() yerine PaymentRepository.createSession().
      final data = await ref
          .read(paymentRepositoryProvider)
          .createSession(amount: widget.amount, buyer: buyer);

      if (data['status'] == 'success') {
        setState(() {
          _htmlContent = data['checkoutFormContent'] as String?;
          _isLoading = false;
          _setupController();
        });
      } else {
        throw Exception(data['errorMessage'] ?? 'Payment initialization failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
        Navigator.pop(context);
      }
    }
  }

  void _setupController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            if (request.url.contains('payment-success')) {
              Navigator.pop(context, true);
              return NavigationDecision.prevent;
            }
            if (request.url.contains('payment-failure')) {
              Navigator.pop(context, false);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadHtmlString(_htmlContent!);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Güvenli Ödeme')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : WebViewWidget(controller: _controller),
    );
  }
}
