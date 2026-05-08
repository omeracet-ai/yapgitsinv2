import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'message_templates_repository.dart';

final messageTemplatesProvider =
    FutureProvider.autoDispose<List<String>>((ref) async {
  return ref.watch(messageTemplatesRepositoryProvider).list();
});
