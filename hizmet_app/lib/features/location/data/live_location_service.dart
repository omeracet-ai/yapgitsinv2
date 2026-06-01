// Phase 354 — Live location sharing client (prototype, local test).
//
// İki rol:
// * Hizmet Veren (worker) → AKTIF emitter. `Geolocator` stream'i throttled
//   `location:update` event'i olarak socket'e gönderir.
// * Hizmet Alan (customer) → PASIF dinleyici. `location:peer` event'iyle
//   karşı tarafın koordinatlarını alır; harita marker + polyline route.
//
// Auth: `chatServiceProvider.socket` mevcut bağlantıyı paylaşır (chat ile
// aynı namespace). Booking room: `booking:<id>`.
//
// Kullanım planı (prototip):
//   final svc = ref.read(liveLocationServiceProvider);
//   await svc.join(bookingId);              // her iki taraf
//   svc.startEmitting(bookingId);           // sadece worker
//   svc.peerStream.listen((peer) {...});    // her iki taraf
//   await svc.leave(bookingId);             // her iki taraf

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../chat/data/chat_service.dart';

class LiveLocationPing {
  final String bookingId;
  final String userId;
  final double lat;
  final double lng;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final DateTime ts;
  const LiveLocationPing({
    required this.bookingId,
    required this.userId,
    required this.lat,
    required this.lng,
    required this.ts,
    this.accuracy,
    this.speed,
    this.heading,
  });

  factory LiveLocationPing.fromMap(Map<String, dynamic> m) {
    return LiveLocationPing(
      bookingId: m['bookingId']?.toString() ?? '',
      userId: m['userId']?.toString() ?? '',
      lat: (m['lat'] as num?)?.toDouble() ?? 0,
      lng: (m['lng'] as num?)?.toDouble() ?? 0,
      accuracy: (m['accuracy'] as num?)?.toDouble(),
      speed: (m['speed'] as num?)?.toDouble(),
      heading: (m['heading'] as num?)?.toDouble(),
      ts: DateTime.tryParse(m['ts']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

final liveLocationServiceProvider = Provider<LiveLocationService>((ref) {
  return LiveLocationService(chat: ref.read(chatServiceProvider));
});

class LiveLocationService {
  final ChatService _chat;
  StreamSubscription<Position>? _geoSub;
  String? _emittingBookingId;
  final _peerCtrl = StreamController<LiveLocationPing>.broadcast();
  bool _listenerBound = false;

  LiveLocationService({required ChatService chat}) : _chat = chat;

  Stream<LiveLocationPing> get peerStream => _peerCtrl.stream;

  void _bindListenerOnce() {
    if (_listenerBound) return;
    _listenerBound = true;
    _chat.socket.on('location:peer', (data) {
      if (data is! Map) return;
      try {
        _peerCtrl.add(
          LiveLocationPing.fromMap(Map<String, dynamic>.from(data)),
        );
      } catch (_) {/* ignore malformed */}
    });
  }

  /// Booking odasına katıl. Server party check yapar (404 / 403 dönerse
  /// hata fırlatır). Hem worker hem customer çağırır.
  Future<Map<String, dynamic>> join(String bookingId) async {
    _bindListenerOnce();
    final completer = Completer<Map<String, dynamic>>();
    // socket_io_client v2: emitWithAck callback-based (void return).
    _chat.socket.emitWithAck(
      'location:join',
      {'bookingId': bookingId},
      ack: (ack) {
        if (completer.isCompleted) return;
        if (ack is Map) {
          completer.complete(Map<String, dynamic>.from(ack));
        } else {
          completer.complete({'ok': false, 'reason': 'no-ack'});
        }
      },
    );
    return completer.future.timeout(
      const Duration(seconds: 5),
      onTimeout: () => {'ok': false, 'reason': 'timeout'},
    );
  }

  /// Booking odasından ayrıl. Cleanup.
  Future<void> leave(String bookingId) async {
    if (_emittingBookingId == bookingId) stopEmitting();
    _chat.socket.emit('location:leave', {'bookingId': bookingId});
  }

  /// SADECE WORKER tarafı çağırır. Throttled (default 10s) GPS stream
  /// başlatır → her tick'te socket'e emit.
  Future<void> startEmitting(
    String bookingId, {
    int intervalSeconds = 10,
    LocationAccuracy accuracy = LocationAccuracy.high,
  }) async {
    if (_emittingBookingId == bookingId) return; // zaten emit ediyor
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      final asked = await Geolocator.requestPermission();
      if (asked == LocationPermission.denied ||
          asked == LocationPermission.deniedForever) {
        throw StateError('Konum izni reddedildi');
      }
    }
    _emittingBookingId = bookingId;
    _geoSub = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: accuracy,
        distanceFilter: 5, // min 5m hareket
        timeLimit: Duration(seconds: intervalSeconds * 2),
      ),
    ).listen((pos) {
      _chat.socket.emit('location:update', {
        'bookingId': bookingId,
        'lat': pos.latitude,
        'lng': pos.longitude,
        'accuracy': pos.accuracy,
        'speed': pos.speed,
        'heading': pos.heading,
      });
    });
  }

  void stopEmitting() {
    _geoSub?.cancel();
    _geoSub = null;
    _emittingBookingId = null;
  }

  void dispose() {
    stopEmitting();
    _peerCtrl.close();
  }
}
