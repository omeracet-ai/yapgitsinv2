// FlutterFlow Custom Action — Gemini (Google) API
// Action Name: geminiChat
// Return Type: String
// Arguments:
//   - userMessage (String): Kullanıcının mesajı
//   - systemPrompt (String, optional): Sistem talimatı
//   - apiKey (String): Google AI Studio API anahtarı

import 'package:dio/dio.dart';

Future<String> geminiChat({
  required String userMessage,
  String systemPrompt = 'Sen Yapgitsin platformunun yardımcı asistanısın. Türkçe cevap ver.',
  required String apiKey,
}) async {
  final dio = Dio();
  const model = 'gemini-2.0-flash';

  try {
    final response = await dio.post(
      'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey',
      options: Options(headers: {'content-type': 'application/json'}),
      data: {
        'system_instruction': {
          'parts': [{'text': systemPrompt}],
        },
        'contents': [
          {
            'role': 'user',
            'parts': [{'text': userMessage}],
          }
        ],
        'generationConfig': {
          'maxOutputTokens': 1024,
          'temperature': 0.7,
        },
      },
    );

    final candidates = response.data['candidates'] as List;
    final parts = candidates.first['content']['parts'] as List;
    return (parts.first['text'] as String?) ?? '';
  } on DioException catch (e) {
    final msg = e.response?.data?['error']?['message'] ?? e.message;
    throw Exception('Gemini API hatası: $msg');
  }
}
