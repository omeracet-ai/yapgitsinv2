import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../theme/app_colors.dart';

/// Tam ekran harita picker.
/// [onLocationSelected] → (adres, lat, lng) döner.
class LocationPickerScreen extends StatefulWidget {
  final String? initialAddress;
  const LocationPickerScreen({super.key, this.initialAddress});

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  // Varsayılan: İstanbul merkezi
  LatLng _selected = const LatLng(41.0082, 28.9784);
  String _address   = '';
  bool _loading     = false;

  final _searchController = TextEditingController();
  final _mapController    = MapController();
  final _dio              = Dio(BaseOptions(connectTimeout: const Duration(seconds: 8)));

  List<Map<String, dynamic>> _suggestions = [];
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialAddress != null && widget.initialAddress!.isNotEmpty) {
      _address = widget.initialAddress!;
      _searchByAddress(widget.initialAddress!);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _mapController.dispose();
    _dio.close();
    super.dispose();
  }

  // Haritaya tıklanınca → reverse geocode
  Future<void> _onMapTap(TapPosition _, LatLng point) async {
    setState(() { _selected = point; _loading = true; _suggestions = []; });
    try {
      final res = await _dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'lat': point.latitude,
          'lon': point.longitude,
          'format': 'json',
          'accept-language': 'tr',
        },
        options: Options(headers: {'User-Agent': 'HizmetApp/1.0'}),
      );
      final data = res.data as Map<String, dynamic>;
      setState(() => _address = data['display_name'] ?? '${point.latitude}, ${point.longitude}');
    } catch (_) {
      setState(() => _address = '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}');
    } finally {
      setState(() => _loading = false);
    }
  }

  // Arama kutusu → Nominatim suggest
  Future<void> _onSearchChanged(String q) async {
    if (q.length < 3) { setState(() => _suggestions = []); return; }
    setState(() => _searching = true);
    try {
      final res = await _dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': q,
          'format': 'json',
          'limit': 5,
          'accept-language': 'tr',
          'countrycodes': 'tr',
        },
        options: Options(headers: {'User-Agent': 'HizmetApp/1.0'}),
      );
      final list = (res.data as List).cast<Map<String, dynamic>>();
      setState(() => _suggestions = list);
    } catch (_) {
      setState(() => _suggestions = []);
    } finally {
      setState(() => _searching = false);
    }
  }

  Future<void> _searchByAddress(String q) async {
    if (q.isEmpty) return;
    setState(() => _loading = true);
    try {
      final res = await _dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {'q': q, 'format': 'json', 'limit': 1, 'accept-language': 'tr'},
        options: Options(headers: {'User-Agent': 'HizmetApp/1.0'}),
      );
      final list = (res.data as List).cast<Map<String, dynamic>>();
      if (list.isNotEmpty) {
        final lat = double.parse(list[0]['lat'] as String);
        final lon = double.parse(list[0]['lon'] as String);
        setState(() {
          _selected = LatLng(lat, lon);
          _address  = list[0]['display_name'] as String? ?? q;
        });
        _mapController.move(_selected, 14);
      }
    } catch (_) {} finally {
      setState(() => _loading = false);
    }
  }

  void _selectSuggestion(Map<String, dynamic> s) {
    final lat = double.parse(s['lat'] as String);
    final lon = double.parse(s['lon'] as String);
    final addr = s['display_name'] as String? ?? '';
    setState(() {
      _selected    = LatLng(lat, lon);
      _address     = addr;
      _suggestions = [];
      _searchController.text = addr;
    });
    _mapController.move(_selected, 14);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Konum Seç'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _address.isEmpty
                ? null
                : () => Navigator.pop(context, {
                      'address': _address,
                      'lat': _selected.latitude,
                      'lng': _selected.longitude,
                    }),
            child: const Text('Onayla',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Harita
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _selected,
              initialZoom: 11,
              onTap: _onMapTap,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.hizmetapp.app',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _selected,
                    width: 50,
                    height: 50,
                    child: const Icon(Icons.location_pin,
                        color: Colors.red, size: 46),
                  ),
                ],
              ),
            ],
          ),

          // Arama kutusu (üst)
          Positioned(
            top: 12, left: 12, right: 12,
            child: Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(color: Colors.black26, blurRadius: 8),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    onSubmitted: (v) {
                      setState(() => _suggestions = []);
                      _searchByAddress(v);
                    },
                    decoration: InputDecoration(
                      hintText: 'Adres veya semt ara...',
                      prefixIcon: const Icon(Icons.search, color: AppColors.primary),
                      suffixIcon: _searching
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                  width: 16, height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _suggestions = []);
                                  },
                                )
                              : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                if (_suggestions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: const [
                        BoxShadow(color: Colors.black26, blurRadius: 8),
                      ],
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, indent: 14),
                      itemBuilder: (_, i) {
                        final s = _suggestions[i];
                        return ListTile(
                          dense: true,
                          leading: const Icon(Icons.place_outlined,
                              color: AppColors.primary, size: 20),
                          title: Text(
                            s['display_name'] as String? ?? '',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13),
                          ),
                          onTap: () => _selectSuggestion(s),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // Seçilen adres (alt)
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12)],
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: _loading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(8),
                        child: CircularProgressIndicator(),
                      ))
                  : Row(
                      children: [
                        const Icon(Icons.location_on, color: AppColors.primary, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _address.isEmpty
                                ? 'Haritaya dokunarak konum seçin'
                                : _address,
                            style: TextStyle(
                              fontSize: 13,
                              color: _address.isEmpty
                                  ? AppColors.textHint
                                  : AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
