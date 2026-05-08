import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:dio/dio.dart';
import '../../../../core/constants/api_constants.dart';

class IyzicoPaymentScreen extends StatefulWidget {
  final double amount;

  const IyzicoPaymentScreen({super.key, required this.amount});

  @override
  State<IyzicoPaymentScreen> createState() => _IyzicoPaymentScreenState();
}

class _IyzicoPaymentScreenState extends State<IyzicoPaymentScreen> {
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
      final dio = Dio();
      final response = await dio.post('${ApiConstants.baseUrl}/payments/create-session', data: {
        'price': widget.amount.toString(),
        'paidPrice': widget.amount.toString(),
        'basketId': 'B${DateTime.now().millisecondsSinceEpoch}',
        'user': {
          'id': 'U123',
          'name': 'Yapgitsin',
          'surname': 'User',
          'email': 'user@hizmetapp.com',
        },
      });

      if (response.data['status'] == 'success') {
        setState(() {
          _htmlContent = response.data['checkoutFormContent'];
          _isLoading = false;
          _setupController();
        });
      } else {
        throw Exception(response.data['errorMessage'] ?? 'Payment initialization failed');
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
