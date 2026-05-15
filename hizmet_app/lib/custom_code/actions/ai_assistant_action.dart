// FlutterFlow Custom Action — Secure AI Assistant (Proxy via Firebase Backend)
// Action Name: aiAssistant
// Return Type: String (Future)
// Arguments:
//   - userMessage (String, Required)
//   - context (String, Optional)
//   - provider (String, Optional) — 'claude' veya 'gemini'
//   - userToken (String, Required) — Firebase Auth ID Token

import 'dart:convert';
import 'package:http/http.dart' as http;

Future<String> aiAssistant({
  required String userMessage,
  String context = '',
  String provider = 'gemini',
  required String userToken,
}) async {
  // NOT: Artık API anahtarı mobil tarafta tutulmuyor! 
  // Tüm çağrılar güvenli yapgitsin.tr API'si üzerinden geçiyor.
  const String apiBaseUrl = 'https://api.yapgitsin.tr/v1/ai/assistant';

  try {
    final response = await http.post(
      Uri.parse(apiBaseUrl),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $userToken',
      },
      body: jsonEncode({
        'message': userMessage,
        'context': context,
        'provider': provider,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['text'] as String?) ?? 'Üzgünüm, bir yanıt alamadım.';
    } else {
      final errorData = jsonDecode(response.body);
      return 'Hata: ${errorData['message'] ?? 'Sunucu yanıt vermedi.'}';
    }
  } catch (e) {
    return 'Bağlantı hatası: $e';
  }
}
