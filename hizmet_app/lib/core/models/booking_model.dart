import 'package:equatable/equatable.dart';

enum BookingStatus {
  pending,
  confirmed,
  in_progress,
  completed,
  cancelled,
}

class Booking extends Equatable {
  final String id;
  final String customerId;
  final String workerId;
  final String category;
  final String? subCategory;
  final String description;
  final String address;
  final DateTime scheduledDate;
  final String? scheduledTime;
  final BookingStatus status;
  final double? agreedPrice;

  const Booking({
    required this.id,
    required this.customerId,
    required this.workerId,
    required this.category,
    this.subCategory,
    required this.description,
    required this.address,
    required this.scheduledDate,
    this.scheduledTime,
    required this.status,
    this.agreedPrice,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'],
      customerId: json['customerId'],
      workerId: json['workerId'],
      category: json['category'],
      subCategory: json['subCategory'],
      description: json['description'],
      address: json['address'],
      scheduledDate: DateTime.parse(json['scheduledDate']),
      scheduledTime: json['scheduledTime'],
      status: BookingStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => BookingStatus.pending,
      ),
      agreedPrice: (json['agreedPrice'] as num?)?.toDouble(),
    );
  }

  @override
  List<Object?> get props => [id, status, scheduledDate];
}
