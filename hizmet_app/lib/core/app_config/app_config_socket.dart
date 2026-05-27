import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../constants/api_constants.dart';
import 'app_config_provider.dart';

/// Connects to the `/app-config` Socket.IO namespace and invalidates
/// [appConfigProvider] whenever the admin panel emits `app-config:updated`.
///
/// Fire-and-forget — kept alive for the whole app lifetime. Network errors
/// are swallowed; failure here never blocks the UI (the 60s SP cache TTL
/// still acts as a fallback poll mechanism).
final appConfigSocketProvider = Provider<IO.Socket>((ref) {
  final socket = IO.io(
    '${ApiConstants.baseUrl}/app-config',
    IO.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .enableReconnection()
        .build(),
  );

  socket.onConnect((_) {
    if (kDebugMode) debugPrint('[app-config] socket connected');
  });
  socket.onDisconnect((_) {
    if (kDebugMode) debugPrint('[app-config] socket disconnected');
  });
  socket.on('app-config:updated', (payload) {
    if (kDebugMode) debugPrint('[app-config] updated → refetch: $payload');
    // Bypass the 60s SP/in-memory cache and refetch immediately. Then
    // invalidate the FutureProvider so all listening widgets rebuild
    // with the fresh config.
    final svc = ref.read(appConfigServiceProvider);
    // ignore: discarded_futures
    svc.fetch(forceRefresh: true).whenComplete(() {
      ref.invalidate(appConfigProvider);
    });
  });

  ref.onDispose(() {
    try {
      socket.dispose();
    } catch (_) {}
  });

  return socket;
});

/// Call once at app startup (e.g. in main.dart after ProviderScope is created)
/// to eagerly establish the connection. Safe to call multiple times.
void initAppConfigSocket(WidgetRef ref) {
  ref.read(appConfigSocketProvider);
}
