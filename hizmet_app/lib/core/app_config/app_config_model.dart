/// Remote-configurable application config fetched from `GET /app-config`.
///
/// Tüm alanlar opsiyonel; backend down olursa [AppConfig.fallback] devreye girer.
class AppConfig {
  final Map<String, dynamic> settings;
  final Map<String, dynamic> theme;
  final Map<String, dynamic> branding;
  final List<Map<String, dynamic>> layouts;
  final List<Map<String, dynamic>> visibility;
  final List<Map<String, dynamic>> screens;

  const AppConfig({
    this.settings = const {},
    this.theme = const {},
    this.branding = const {},
    this.layouts = const [],
    this.visibility = const [],
    this.screens = const [],
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    return AppConfig(
      settings: _asMap(json['settings']),
      theme: _asMap(json['theme']),
      branding: _asMap(json['branding']),
      layouts: _asListOfMap(json['layouts']),
      visibility: _asListOfMap(json['visibility']),
      screens: _asListOfMap(json['screens']),
    );
  }

  Map<String, dynamic> toJson() => {
        'settings': settings,
        'theme': theme,
        'branding': branding,
        'layouts': layouts,
        'visibility': visibility,
        'screens': screens,
      };

  /// Hardcoded defaults — backend yokken app çökmez.
  /// Değerler mevcut AppColors/branding ile birebir.
  static AppConfig fallback() => const AppConfig(
        settings: {},
        theme: {
          'primary': '#4ADE80',
          'surface': '#161B22',
          'text': '#FFFFFF',
          'radius': 16,
          'font': 'Inter',
        },
        branding: {
          'appTitle': 'Yapgitsin',
          'logoUrl': null,
          'iconUrl': null,
          'splashUrl': null,
        },
        layouts: [],
        visibility: [],
      );

  static Map<String, dynamic> _asMap(dynamic v) {
    if (v is Map) return Map<String, dynamic>.from(v);
    return const {};
  }

  static List<Map<String, dynamic>> _asListOfMap(dynamic v) {
    if (v is List) {
      return v
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList(growable: false);
    }
    return const [];
  }
}
