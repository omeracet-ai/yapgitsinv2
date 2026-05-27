import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Uygulama genelinde tutarlı gradient header (light yeşil → siyah, 3D
/// diagonal). Mevcut AppBar API'siyle uyumlu — sadece flexibleSpace ile
/// gradient zemin verir; backgroundColor şeffaftır.
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final List<Widget>? actions;
  final Widget? leading;
  final PreferredSizeWidget? bottom;
  final double elevation;
  final bool centerTitle;
  final IconThemeData? iconTheme;

  const GradientAppBar({
    super.key,
    this.title,
    this.actions,
    this.leading,
    this.bottom,
    this.elevation = 0,
    this.centerTitle = false,
    this.iconTheme,
  });

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    // Tema-duyarlı: light → beyaz zemin + koyu foreground; dark → koyu zemin + beyaz foreground.
    final bg = AppColors.headerSurface;
    final fg = AppColors.headerForeground;
    return AppBar(
      title: title,
      actions: actions,
      leading: leading,
      bottom: bottom,
      elevation: elevation,
      centerTitle: centerTitle,
      foregroundColor: fg,
      iconTheme: iconTheme ?? IconThemeData(color: fg),
      backgroundColor: Colors.transparent,
      flexibleSpace: Container(
        decoration: BoxDecoration(color: bg),
      ),
    );
  }
}
