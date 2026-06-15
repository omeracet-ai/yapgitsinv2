class ApiConstants {
  static const int backendPort = 3001;

  // Default: prod. Dev/ngrok için: --dart-define=API_URL=http://10.0.2.2:3001
  static const String _prodUrl = 'https://api.yapgitsin.tr';
  static const String _override =
      String.fromEnvironment('API_URL', defaultValue: '');

  static String get baseUrl =>
      _override.isNotEmpty ? _override : _prodUrl;
}
