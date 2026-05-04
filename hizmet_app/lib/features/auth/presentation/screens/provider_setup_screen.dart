// Provider setup kaldırıldı — bu dosya artık kullanılmıyor
import 'package:flutter/material.dart';

class ProviderSetupScreen extends StatelessWidget {
  final Map<String, dynamic> userData;
  const ProviderSetupScreen({super.key, required this.userData});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Bu sayfa kaldırıldı')));
  }
}
