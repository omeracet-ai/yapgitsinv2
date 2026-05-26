import 'package:flutter/material.dart';

/// Tek merkezden uygulama logosu. Launcher icon ile aynı dosyayı
/// (`assets/icons/app_icon.png`) kullanır → in-app görseller ve launcher
/// ikonu görsel olarak tutarlı.
class AppLogo extends StatelessWidget {
  final double size;
  final BorderRadius? borderRadius;

  const AppLogo({super.key, this.size = 48, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(size * 0.22);
    return ClipRRect(
      borderRadius: radius,
      child: Image.asset(
        'assets/icons/app_icon.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
      ),
    );
  }
}
