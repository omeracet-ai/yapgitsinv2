import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';

/// Singleton [ApiClient] for the app. Survives the lifetime of the
/// ProviderContainer. Call-site migration (231 Dio usages) is a later phase —
/// for now this provider exists so new code can opt in.
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
