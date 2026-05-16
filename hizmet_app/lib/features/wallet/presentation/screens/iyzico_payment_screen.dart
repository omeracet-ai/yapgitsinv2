import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../data/payment_repository.dart';

class IyzicoPaymentScreen extends ConsumerStatefulWidget {
  final double amount;

  const IyzicoPaymentScreen({super.key, required this.amount});

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
      // Phase 244 — raw Dio() yerine PaymentRepository.createSession().
      final data = await ref
          .read(paymentRepositoryProvider)
          .createSession(amount: widget.amount);

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
