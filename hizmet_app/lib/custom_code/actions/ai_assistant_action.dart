// FlutterFlow Custom Action — Secure AI Assistant (Backend Proxy)
// Action Name: aiAssistant
// Return Type: String (Future)
// Arguments:
//   - userMessage (String, Required)
//   - context (String, Optional)
//   - userToken (String, Required) — Backend JWT (access token)
//
// All AI calls are proxied through the NestJS backend `/ai/chat` endpoint.
// No third-party API keys are ever shipped in the APK.

import 'dart:convert';
import 'package:http/http.dart' as http;

import '../../core/constants/api_constants.dart';

Future<String> aiAssistant({
  required String userMessage,
  String context = '',
  required String userToken,
}) async {
  final url = Uri.parse('${ApiConstants.baseUrl}/ai/chat');

  try {
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $userToken',
      },
      body: jsonEncode({
        'message': userMessage,
        if (context.isNotEmpty)
          'history': [
            {'role': 'user', 'content': context},
          ],
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return (data['reply'] as String?) ?? 'Üzgünüm, bir yanıt alamadım.';
    }
    try {
      final err = jsonDecode(response.body) as Map<String, dynamic>;
      return 'Hata: ${err['message'] ?? 'Sunucu yanıt vermedi.'}';
    } catch (_) {
      return 'Hata: HTTP ${response.statusCode}';
    }
  } catch (e) {
    return 'Bağlantı hatası: $e';
  }
}
