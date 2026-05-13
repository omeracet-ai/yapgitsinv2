import 'package:flutter/material.dart';

class DeferredScreenLoader extends StatelessWidget {
  final Future<void> Function() loader;
  final Widget Function() builder;
  const DeferredScreenLoader({super.key, required this.loader, required this.builder});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: loader(),
      builder: (ctx, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return Center(child: Text('Yüklenemedi: ${snap.error}'));
        }
        return builder();
      },
    );
  }
}
