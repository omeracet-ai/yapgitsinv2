/// Phase 396 — Google Maps "2 renk sade" tema JSON'ları.
///
/// Light/dark Yapgitsin tema ile uyumlu minimal stil. Sadece zemin + label;
/// roads minimal, POI gizli, water yumuşak ton. Map controller
/// `setMapStyle(_)` ile uygulanır.
///
/// Renk seçenekleri Yapgitsin AppColors palet:
/// - Dark: bg #0C1117, surface #161B22, text white
/// - Light: bg #F8F9FA, surface #FFFFFF, text #161B22
class YapgitsinMapStyle {
  /// Dark tema 2 renk minimal. Yapgitsin koyu palet (#0C1117 + #161B22).
  static const String dark = '''
[
  {"elementType":"geometry","stylers":[{"color":"#0C1117"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#9CA3AF"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#0C1117"}]},
  {"featureType":"administrative.country","elementType":"geometry.stroke","stylers":[{"color":"#30363D"}]},
  {"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},
  {"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#9CA3AF"}]},
  {"featureType":"administrative.neighborhood","stylers":[{"visibility":"off"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#161B22"}]},
  {"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#1C2128"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#1C2128"}]},
  {"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#161B22"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#161B22"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#6B7280"}]}
]
''';

  /// Light tema 2 renk minimal. Yapgitsin açık palet (#F8F9FA + #FFFFFF).
  static const String light = '''
[
  {"elementType":"geometry","stylers":[{"color":"#F8F9FA"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#6B7280"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#FFFFFF"}]},
  {"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},
  {"featureType":"administrative.neighborhood","stylers":[{"visibility":"off"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#FFFFFF"}]},
  {"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#F1F3F5"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#F1F3F5"}]},
  {"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#FFFFFF"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#E5E7EB"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#9CA3AF"}]}
]
''';
}
