import 'package:flutter/material.dart';

/// Yapgitsin marka logosu + dairesel spinner kombinasyonu.
/// Splash dışındaki tüm yükleme ekranlarında kullanılır (loading state,
/// async operasyon vb.) — tutarlı marka kimliği.
class YapgitsinLoader extends StatelessWidget {
  final double size;
  final String? label;
  const YapgitsinLoader({super.key, this.size = 56, this.label});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: size,
                  height: size,
                  child: const CircularProgressIndicator(strokeWidth: 2.5),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(size * 0.22),
                  child: Image.asset(
                    'assets/icons/app_icon.png',
                    width: size * 0.65,
                    height: size * 0.65,
                    fit: BoxFit.cover,
                  ),
                ),
              ],
            ),
          ),
          if (label != null) ...[
            const SizedBox(height: 12),
            Text(
              label!,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
