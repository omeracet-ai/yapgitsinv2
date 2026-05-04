import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../../core/constants/api_constants.dart';

final chatServiceProvider = Provider((ref) => ChatService());

class ChatService {
  late IO.Socket socket;

  void connect() {
    socket = IO.io(ApiConstants.baseUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .build()
    );

    socket.onConnect((_) => debugPrint('Connected to socket.io'));
    socket.onDisconnect((_) => debugPrint('Disconnected from socket.io'));
  }

  void sendMessage(String to, String from, String message) {
    socket.emit('sendMessage', {
      'to': to,
      'from': from,
      'message': message,
    });
  }

  void onMessageReceived(Function(Map<String, dynamic>) callback) {
    socket.on('receiveMessage', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void joinRoom(String roomId) {
    socket.emit('joinRoom', roomId);
  }

  void disconnect() {
    socket.disconnect();
  }
}
