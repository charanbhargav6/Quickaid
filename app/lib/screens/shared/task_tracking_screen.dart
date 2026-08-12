import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../../services/supabase_service.dart';

class TaskTrackingScreen extends StatefulWidget {
  final String taskId;
  final String helperId;
  final String seekerId;
  final double taskLat;
  final double taskLng;
  final String taskTitle;

  const TaskTrackingScreen({
    super.key,
    required this.taskId,
    required this.helperId,
    required this.seekerId,
    required this.taskLat,
    required this.taskLng,
    required this.taskTitle,
  });

  @override
  State<TaskTrackingScreen> createState() => _TaskTrackingScreenState();
}

class _TaskTrackingScreenState extends State<TaskTrackingScreen> {
  final MapController _mapController = MapController();
  LatLng? _helperPosition;
  List<LatLng> _routePoints = [];
  bool _isLoadingRoute = false;
  
  StreamSubscription<Position>? _positionStream;
  StreamSubscription<List<Map<String, dynamic>>>? _dbStream;
  
  bool get _isHelper => SupabaseService.currentUser?.id == widget.helperId;

  @override
  void initState() {
    super.initState();
    _initTracking();
  }

  Future<void> _initTracking() async {
    if (_isHelper) {
      // Setup live GPS streaming from phone to Supabase
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
      
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      // Initial position
      Position pos = await Geolocator.getCurrentPosition();
      _updateHelperLocation(pos.latitude, pos.longitude);
      
      // Listen to movement
      _positionStream = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10),
      ).listen((Position position) {
        _updateHelperLocation(position.latitude, position.longitude);
      });
    } else {
      // As Seeker, listen to Supabase profiles table for Helper's location
      _dbStream = SupabaseService.client
          .from('profiles')
          .stream(primaryKey: ['id'])
          .eq('id', widget.helperId)
          .listen((List<Map<String, dynamic>> data) {
        if (data.isNotEmpty) {
          final profile = data.first;
          if (profile['latitude'] != null && profile['longitude'] != null) {
            final lat = (profile['latitude'] as num).toDouble();
            final lng = (profile['longitude'] as num).toDouble();
            
            if (_helperPosition == null || _helperPosition!.latitude != lat || _helperPosition!.longitude != lng) {
              setState(() {
                _helperPosition = LatLng(lat, lng);
              });
              _fetchRoute();
            }
          }
        }
      });
    }
  }

  Future<void> _updateHelperLocation(double lat, double lng) async {
    setState(() {
      _helperPosition = LatLng(lat, lng);
    });
    
    // Push to backend so Seeker can see
    await SupabaseService.client.from('profiles').update({
      'latitude': lat,
      'longitude': lng,
    }).eq('id', widget.helperId);
    
    _fetchRoute();
  }

  Future<void> _fetchRoute() async {
    if (_helperPosition == null || _isLoadingRoute) return;
    
    setState(() => _isLoadingRoute = true);
    
    try {
      final startLng = _helperPosition!.longitude;
      final startLat = _helperPosition!.latitude;
      final endLng = widget.taskLng;
      final endLat = widget.taskLat;
      
      final url = 'http://router.project-osrm.org/route/v1/driving/$startLng,$startLat;$endLng,$endLat?geometries=geojson';
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['routes'] != null && data['routes'].isNotEmpty) {
          final geometry = data['routes'][0]['geometry']['coordinates'] as List;
          setState(() {
            _routePoints = geometry.map((point) => LatLng((point[1] as num).toDouble(), (point[0] as num).toDouble())).toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    } finally {
      if (mounted) setState(() => _isLoadingRoute = false);
    }
  }

  void _centerMap() {
    if (_helperPosition != null) {
      _mapController.move(_helperPosition!, 15.0);
    }
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _dbStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Live Tracking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(widget.taskTitle, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        backgroundColor: const Color(0xFF22C55E),
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _helperPosition ?? LatLng(widget.taskLat, widget.taskLng),
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.quickaid.app',
              ),
              if (_routePoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints,
                      strokeWidth: 5.0,
                      color: Colors.blueAccent,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(widget.taskLat, widget.taskLng),
                    width: 60,
                    height: 60,
                    child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                  ),
                  if (_helperPosition != null)
                    Marker(
                      point: _helperPosition!,
                      width: 60,
                      height: 60,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.blue, width: 3),
                          boxShadow: [const BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: const Icon(Icons.delivery_dining, color: Colors.blue, size: 30),
                      ),
                    ),
                ],
              ),
            ],
          ),
          
          // Helper Info Card
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 50, height: 50,
                    decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.person, color: Colors.blue),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_isHelper ? 'You are en route' : 'Helper is on the way', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text(_routePoints.isEmpty ? 'Calculating route...' : 'Route updated live', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _centerMap,
                    icon: const Icon(Icons.my_location, color: Colors.blueAccent),
                    style: IconButton.styleFrom(backgroundColor: Colors.blue.withOpacity(0.1)),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
