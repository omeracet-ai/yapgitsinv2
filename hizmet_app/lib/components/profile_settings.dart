import 'package:flutter/material.dart';

class ProfileSettings extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Para birimi kaldırıldı, dil seçeneği aktif edildi.
        ListTile(
          leading: Icon(Icons.language_outlined, color: Colors.blue),
          title: Text('Dil / Language'),
          trailing: DropdownButton<String>(
            value: 'TR',
            items: [
              DropdownMenuItem(value: 'TR', child: Text('Türkçe')),
              DropdownMenuItem(value: 'EN', child: Text('English')),
              DropdownMenuItem(value: 'AZ', child: Text('Azərbaycan')),
            ],
            onChanged: (val) {},
          ),
        ),
        // Tema Değiştirici
        ListTile(
          leading: Icon(Icons.brightness_4_outlined, color: Colors.orange),
          title: Text('Tema / Theme'),
          trailing: Switch(
            value: Theme.of(context).brightness == Brightness.dark,
            onChanged: (val) {
              // Theme switching logic here
            },
          ),
        ),
      ],
    );
  }
}
