// FlutterFlow Custom Action — Claude (Anthropic) API
// Action Name: claudeChat
// Return Type: String
// Arguments:
//   - userMessage (String): Kullanıcının mesajı
//   - systemPrompt (String, optional): Sistem talimatı
//   - apiKey (String): Anthropic API anahtarı

import 'dart:convert';
import 'package:dio/dio.dart';

Future<String> claudeChat({
  required String userMessage,
  String systemPrompt = 'Sen Yapgitsin platformunun yardımcı asistanısın. Türkçe cevap ver.',
  required String apiKey,
}) async {
  final dio = Dio();

  try {
    final response = await dio.post(
      'https://api.anthropic.com/v1/messages',
      options: Options(
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      ),
      data: {
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 1024,
        'system': systemPrompt,
        'messages': [
          {'role': 'user', 'content': userMessage},
        ],
      },
    );

    final content = response.data['content'] as List;
    return (content.first['text'] as String?) ?? '';
  } on DioException catch (e) {
    final msg = e.response?.data?['error']?['message'] ?? e.message;
    throw Exception('Claude API hatası: $msg');
  }
}
