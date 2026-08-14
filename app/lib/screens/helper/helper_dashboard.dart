import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../shared/chat_screen.dart';
import '../shared/task_tracking_screen.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../widgets/skeleton_loader.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:ui';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:async';

class HelperDashboard extends StatefulWidget {
  const HelperDashboard({super.key});

  @override
  State<HelperDashboard> createState() => _HelperDashboardState();
}

class _HelperDashboardState extends State<HelperDashboard> {
  bool _loading = true;
  List<Map<String, dynamic>> _openTasks = [];
  List<Map<String, dynamic>> _myTasks = [];
  Map<String, dynamic> _currentUser = {};
  bool _showMap = false;
  bool _isAvailable = false;
  int _activeTab = 0; // 0: Feed, 1: My Jobs
  
  String _searchQuery = '';
  String _category = '';
  double? _minPay;
  Timer? _locationTimer;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupRealtime();
    _locationTimer = Timer.periodic(const Duration(seconds: 15), (_) => _streamLocation());
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _setupRealtime() {
    _realtimeChannel = SupabaseService.client.channel('helper-dashboard-realtime')
      // ── New task posted: add to feed ─────────────────────
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'tasks',
        callback: (payload) {
          final inserted = payload.newRecord;
          final myId = _currentUser['id'];
          // Skip own tasks and non-open tasks
          if (inserted['seeker_id'] == myId) return;
          if (inserted['status'] != 'open') return;
          if (!mounted) return;
          setState(() {
            final exists = _openTasks.any((t) => t['id'] == inserted['id']);
            if (!exists) {
              _openTasks.insert(0, inserted);
            }
          });
        }
      )
      // ── Task updated: status change (accepted/cancelled/completed) ─
      .onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'tasks',
        callback: (payload) {
          final updated = payload.newRecord;
          final myId = _currentUser['id'];
          if (!mounted) return;
          setState(() {
            // Remove from feed if no longer open
            if (updated['status'] != 'open') {
              _openTasks.removeWhere((t) => t['id'] == updated['id']);
            }
            // Update my tasks list if this helper is assigned
            if (updated['helper_id'] == myId) {
              final idx = _myTasks.indexWhere((t) => t['id'] == updated['id']);
              if (idx != -1) {
                final seeker = _myTasks[idx]['seeker'];
                _myTasks[idx] = {...updated, 'seeker': seeker};
              } else if (['accepted', 'in_progress'].contains(updated['status'])) {
                _myTasks.insert(0, updated);
              }
            }
          });
        }
      )
      .subscribe();
  }

  Future<void> _streamLocation() async {
    final hasAcceptedTasks = _myTasks.any((t) => t['status'] == 'accepted');
    if (!hasAcceptedTasks) return;
    try {
      Position pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      await SupabaseService.updateLocation(pos.latitude, pos.longitude);
    } catch (e) {
      debugPrint('Location stream error: $e');
    }
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      await Future.any([
        Future(() async {
          final user = SupabaseService.currentUser;
          if (user != null) {
            final profile = await SupabaseService.getProfile(user.id);
            if (profile != null) {
              _currentUser = profile;
              _isAvailable = profile['is_available'] == true;
            }
          }

          // Get location for nearby tasks
          bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
          LocationPermission permission = await Geolocator.checkPermission();
          
          if (permission == LocationPermission.denied) {
            permission = await Geolocator.requestPermission();
          }
          
          if (serviceEnabled && (permission == LocationPermission.whileInUse || permission == LocationPermission.always)) {
            Position position = await Geolocator.getCurrentPosition();
            _openTasks = await SupabaseService.getNearbyTasks(
              position.latitude, 
              position.longitude, 
              10.0,
              searchQuery: _searchQuery,
              category: _category,
              minPay: _minPay,
            );
            // If available, update their current location too
            if (_isAvailable) {
              await SupabaseService.toggleAvailability(4, lat: position.latitude, lng: position.longitude);
            }
          } else {
            // No GPS: load all open tasks without distance filter
            final fallbackRes = await SupabaseService.client
                .from('tasks')
                .select('*, seeker:profiles!seeker_id(full_name, trust_score)')
                .eq('status', 'open')
                .neq('seeker_id', _currentUser['id'] ?? '')
                .order('created_at', ascending: false);
            _openTasks = List<Map<String, dynamic>>.from(fallbackRes);
          }
          
          final myTasksRes = await SupabaseService.client
              .from('tasks')
              .select('*, seeker:profiles!seeker_id(full_name)')
              .eq('helper_id', _currentUser['id'])
              .inFilter('status', ['accepted', 'in_progress', 'completed'])
              .order('created_at', ascending: false);
          
          _myTasks = List<Map<String, dynamic>>.from(myTasksRes);
        }),
        Future.delayed(const Duration(seconds: 15), () => throw Exception('Timeout loading data'))
      ]);
    } catch (e) {
      debugPrint('Error loading helper data: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _acceptTask(String taskId) async {
    await SupabaseService.acceptTask(taskId, _currentUser['id']);
    _loadData();
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task Accepted!')));
  }

  Future<void> _completeTask(String taskId) async {
    await SupabaseService.completeTask(taskId, 'completed');
    _loadData();
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task Completed!')));
  }

  Future<void> _toggleAvailability(bool value) async {
    setState(() {
      _isAvailable = value;
    });
    try {
      if (value) {
        // Mock asking for duration, just hardcode 2 hours for now or show dialog later
        await SupabaseService.toggleAvailability(2, lat: 12.9692, lng: 79.1559);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You are now marked as Available for 2 hours')));
      } else {
        await SupabaseService.toggleAvailability(0);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You are now Offline')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
      setState(() => _isAvailable = !value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tasksDone = _myTasks.where((t) => t['status'] == 'completed').length;
    final totalEarned = double.tryParse(_currentUser['wallet_balance']?.toString() ?? '0') ?? 0.0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Theme.of(context).cardColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text('Exit QuickAid?', style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold)),
            content: Text('Are you sure you want to close the application?', style: TextStyle(color: isDark ? Colors.white70 : Colors.black87)),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              TextButton(
                onPressed: () => Navigator.pop(context, true), 
                child: const Text('Exit', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
              ),
            ],
          ),
        );
        if (shouldExit == true) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        drawer: AppDrawer(user: _currentUser),
        appBar: AppBar(
          title: const Text('Helper Dashboard'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
          ],
        ),
        body: _loading ? const SkeletonListView() : Column(
          children: [
            Container(
              color: Theme.of(context).cardColor,
              child: Row(
              children: [
                _buildTab('Task Feed', 0),
                _buildTab('My Jobs', 1),
              ],
            ),
          ),
          Expanded(
            child: _activeTab == 0
                ? _buildFeedTab(tasksDone, totalEarned)
                : _buildMyJobsTab(),
          ),
        ],
      ),
    ),
    );
  }

  Widget _buildTab(String title, int index) {
    final isActive = _activeTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _activeTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: isActive ? const Color(0xFF22C55E) : Colors.transparent, width: 3)),
          ),
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: isActive ? FontWeight.bold : FontWeight.w500, color: isActive ? const Color(0xFF1E293B) : const Color(0xFF64748B)),
          ),
        ),
      ),
    );
  }

  Widget _buildFeedTab(int done, double earned) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: _isAvailable ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _isAvailable ? const Color(0xFF22C55E) : const Color(0xFFCBD5E1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.directions_run, color: _isAvailable ? const Color(0xFF16A34A) : const Color(0xFF64748B)),
                    const SizedBox(width: 8),
                    Text(
                      _isAvailable ? 'You are Available Now' : 'Go Online',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _isAvailable ? const Color(0xFF15803D) : const Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
                Switch(
                  value: _isAvailable,
                  onChanged: _toggleAvailability,
                  activeColor: const Color(0xFF22C55E),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(child: _buildStatCard('Tasks Done', done.toString(), Icons.task_alt, Colors.blue)),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard('Wallet', '₹${earned.toStringAsFixed(0)}', Icons.account_balance_wallet, Colors.green)),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Search Bar
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E293B) : Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.white12 : Colors.grey[200]!),
                ),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search tasks...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 20),
                            onPressed: () {
                              setState(() {
                                _searchQuery = '';
                                _loadData();
                              });
                            },
                          )
                        : null,
                  ),
                  onChanged: (val) => _searchQuery = val,
                  onSubmitted: (val) => _loadData(),
                ),
              ),
              const SizedBox(height: 12),
              
              // Filter Chips
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildFilterChip('All', ''),
                    const SizedBox(width: 8),
                    _buildFilterChip('Physical', 'physical'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Delivery', 'delivery'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Digital', 'digital'),
                  ],
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Available Tasks Near You', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              IconButton(
                icon: Icon(_showMap ? Icons.list : Icons.map, color: const Color(0xFF22C55E)),
                onPressed: () => setState(() => _showMap = !_showMap),
                tooltip: _showMap ? 'List View' : 'Map View',
              ),
            ],
          ),
        ),
        Expanded(
          child: _showMap ? _buildMapView() : ListView(
            padding: const EdgeInsets.all(16),
            children: _openTasks.isEmpty
                ? [
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: const Text('No open tasks right now.', style: TextStyle(color: Color(0xFF64748B))),
                    )
                  ]
                : _openTasks.map((t) => _buildOpenTaskCard(t)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildMapView() {
    if (_openTasks.isEmpty) {
      return const Center(child: Text('No open tasks to display on map.'));
    }

    final markers = _openTasks.where((t) => t['latitude'] != null && t['longitude'] != null).map((t) {
      return Marker(
        point: LatLng(t['latitude'].toDouble(), t['longitude'].toDouble()),
        width: 60,
        height: 60,
        child: GestureDetector(
          onTap: () {
            // Show modal bottom sheet with task details when marker is tapped
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (ctx) => Container(
                margin: const EdgeInsets.all(16),
                child: _buildOpenTaskCard(t),
              ),
            );
          },
          child: const Column(
            children: [
              Icon(Icons.location_on, color: Color(0xFF22C55E), size: 40),
              Text('Task', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black, backgroundColor: Colors.white)),
            ],
          ),
        ),
      );
    }).toList();

    return FlutterMap(
      options: const MapOptions(
        initialCenter: LatLng(12.9692, 79.1559), // Default VIT
        initialZoom: 14.0,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.app',
        ),
        MarkerLayer(markers: markers),
      ],
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _category == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: () {
        setState(() => _category = value);
        _loadData();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF10B981) : (isDark ? Colors.white12 : Colors.grey[200]),
          borderRadius: BorderRadius.circular(20),
          boxShadow: isSelected ? [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))] : [],
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMyJobsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_myTasks.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
            child: const Text('You have not accepted any jobs yet.', style: TextStyle(color: Color(0xFF64748B))),
          )
        else
          ..._myTasks.map((t) => _buildMyJobCard(t)),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        ],
      ),
    );
  }

  String _parseDescription(String? desc) {
    if (desc == null) return '';
    final idx = desc.indexOf('\n\n[IMAGE:');
    if (idx != -1) return desc.substring(0, idx);
    return desc;
  }

  String? _extractImageUrl(String? desc) {
    if (desc == null) return null;
    final idx = desc.indexOf('\n\n[IMAGE:');
    if (idx != -1) {
      final end = desc.indexOf(']', idx);
      if (end != -1) return desc.substring(idx + 10, end);
    }
    return null;
  }

  void _showCounterOfferDialog(String taskId, String title, double originalPay) {
    final payCtrl = TextEditingController();
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 30, offset: const Offset(0, 10))],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: const Color(0xFF3B82F6).withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.handshake, color: Color(0xFF3B82F6), size: 40),
                ),
                const SizedBox(height: 16),
                const Text('Make an Offer', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Task: $title', style: TextStyle(fontSize: 14, color: Colors.grey[600]), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text('Original Pay: ₹$originalPay', style: const TextStyle(fontSize: 14, color: Colors.green, fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                TextField(
                  controller: payCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF3B82F6)),
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    prefixText: '₹ ',
                    prefixStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF3B82F6)),
                    hintText: '0',
                    filled: true,
                    fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.black12 : Colors.grey[100],
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(child: TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Colors.grey, fontSize: 16)))),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3B82F6),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          final proposedPay = double.tryParse(payCtrl.text);
                          if (proposedPay == null || proposedPay <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
                            return;
                          }
                          try {
                            await SupabaseService.submitOffer(taskId, proposedPay);
                            if (context.mounted) {
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offer submitted successfully!', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green));
                            }
                          } catch (e) {
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                          }
                        },
                        child: const Text('Submit Offer', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOpenTaskCard(Map<String, dynamic> task) {
    final seeker = task['profiles'] ?? task['seeker'];
    final trustScore = seeker != null ? seeker['trust_score'] : null;
    
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFF97316).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.category, size: 12, color: Color(0xFFF97316)),
                          const SizedBox(width: 4),
                          Text(task['category'] ?? 'General', style: const TextStyle(color: Color(0xFFF97316), fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    if (task['distance_km'] != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(color: Colors.blue.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on, size: 12, color: Colors.blue),
                            const SizedBox(width: 4),
                            Text('${task['distance_km'].toStringAsFixed(1)} km', style: const TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                Text('₹${task['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 18)),
              ],
            ),
            const SizedBox(height: 16),
            Text(task['title'], style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: isDark ? Colors.white : const Color(0xFF0F172A))),
            const SizedBox(height: 6),
            Text(_parseDescription(task['description'] ?? ''), style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF475569), fontSize: 14, height: 1.4)),
            
            const SizedBox(height: 16),
            if (task['task_type'] == 'delivery') ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.blue),
                  Expanded(child: Text(task['location_name'] ?? 'Pickup', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                  const Icon(Icons.arrow_right_alt, size: 16),
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                  Expanded(child: Text(task['destination_name'] ?? 'Dropoff', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                ],
              ),
            ] else if (task['task_type'] == 'digital') ...[
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.computer, size: 16, color: Colors.purple),
                  SizedBox(width: 4),
                  Text('Remote / Digital Task', style: TextStyle(fontSize: 13, color: Colors.purple, fontWeight: FontWeight.bold)),
                ],
              ),
            ] else if (task['location_name'] != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                  const SizedBox(width: 4),
                  Expanded(child: Text(task['location_name'], style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                ],
              ),
            ],

            if (_extractImageUrl(task['description']) != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(_extractImageUrl(task['description'])!, height: 150, width: double.infinity, fit: BoxFit.cover),
              ),
            ],
            
            if (seeker != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.2),
                      child: Text((seeker['full_name'] ?? 'U')[0], style: const TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Posted by ${seeker['full_name'] ?? 'Unknown'}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: isDark ? Colors.white : const Color(0xFF0F172A))),
                          if (trustScore != null)
                            Row(
                              children: [
                                const Icon(Icons.verified, size: 14, color: Colors.blue),
                                const SizedBox(width: 4),
                                Text('Trust Score: $trustScore', style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: () => _acceptTask(task['id']),
                    child: const Text('Accept Job', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: () => _showCounterOfferDialog(task['id'], task['title'], double.tryParse(task['pay'].toString()) ?? 0.0),
                    child: const Text('Counter Offer', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fade(duration: 300.ms).slideY(begin: 0.1, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  Widget _buildMyJobCard(Map<String, dynamic> task) {
    final isCompleted = task['status'] == 'completed';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: !isCompleted ? Colors.blue.withValues(alpha: 0.3) : (isDark ? Colors.white12 : Colors.grey[200]!)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: isCompleted ? Colors.green.withValues(alpha: 0.1) : Colors.blue.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 8, height: 8, decoration: BoxDecoration(color: isCompleted ? Colors.green : Colors.blue, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(isCompleted ? 'Completed' : 'In Progress', style: TextStyle(color: isCompleted ? Colors.green : Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Text('₹${task['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 18)),
              ],
            ),
            const SizedBox(height: 16),
            Text(task['title'], style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: isDark ? Colors.white : const Color(0xFF0F172A))),
            const SizedBox(height: 6),
            Text('For: ${task['seeker']?['full_name'] ?? 'Unknown'}', style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF475569), fontSize: 14)),
            
            if (task['task_type'] == 'delivery') ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.blue),
                  Expanded(child: Text(task['location_name'] ?? 'Pickup', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                  const Icon(Icons.arrow_right_alt, size: 16),
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                  Expanded(child: Text(task['destination_name'] ?? 'Dropoff', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                ],
              ),
            ] else if (task['task_type'] == 'digital') ...[
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.computer, size: 16, color: Colors.purple),
                  SizedBox(width: 4),
                  Text('Remote / Digital Task', style: TextStyle(fontSize: 13, color: Colors.purple, fontWeight: FontWeight.bold)),
                ],
              ),
            ] else if (task['location_name'] != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                  const SizedBox(width: 4),
                  Expanded(child: Text(task['location_name'], style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
                ],
              ),
            ],
            
            if (_extractImageUrl(task['description']) != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(_extractImageUrl(task['description'])!, height: 150, width: double.infinity, fit: BoxFit.cover),
              ),
            ],
            if (!isCompleted) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: () => _completeTask(task['id']),
                      child: const Text('Mark as Done', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      icon: const Icon(Icons.chat, size: 16),
                      label: const Text('Chat', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (ctx) => ChatScreen(
                              taskId: task['id'],
                              otherUserName: task['seeker']?['full_name'] ?? 'Seeker',
                              taskTitle: task['title'],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  icon: const Icon(Icons.map, size: 18),
                  label: const Text('Track Task / Start Route', style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (ctx) => TaskTrackingScreen(
                          taskId: task['id'],
                          helperId: SupabaseService.currentUser!.id,
                          seekerId: task['seeker_id'],
                          taskLat: task['lat'] != null ? (task['lat'] as num).toDouble() : 0.0,
                          taskLng: task['lng'] != null ? (task['lng'] as num).toDouble() : 0.0,
                          taskTitle: task['title'],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ] else ...[
              const SizedBox(height: 16),
              OutlinedButton(
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                onPressed: () => _showReviewDialog(task['id'], task['seeker_id'], task['seeker']?['full_name']),
                child: const Text('Rate Seeker', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
      ),
    ).animate().fade(duration: 300.ms).slideX(begin: -0.1, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  void _showReviewDialog(String taskId, String revieweeId, String? name) {
    int rating = 5;
    final commentCtrl = TextEditingController();
    
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: StatefulBuilder(
          builder: (context, setStateDialog) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            return Dialog(
              backgroundColor: Colors.transparent,
              elevation: 0,
              insetPadding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.1), blurRadius: 24, offset: const Offset(0, 10))
                  ],
                  border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!, width: 1.5),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(child: Text('⭐', style: TextStyle(fontSize: 32))),
                    ),
                    const SizedBox(height: 20),
                    Text('Rate $name', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5)),
                    const SizedBox(height: 8),
                    Text('How was your experience working with this Seeker?', textAlign: TextAlign.center, style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 14)),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return GestureDetector(
                          onTap: () => setStateDialog(() => rating = index + 1),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: AnimatedScale(
                              scale: index < rating ? 1.1 : 1.0,
                              duration: const Duration(milliseconds: 150),
                              child: Icon(
                                index < rating ? Icons.star : Icons.star_border,
                                color: index < rating ? Colors.amber : Colors.grey[400],
                                size: 40,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: commentCtrl,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Tell others what you thought...',
                        hintStyle: TextStyle(color: isDark ? Colors.grey[500] : Colors.grey[400], fontSize: 14),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                            onPressed: () => Navigator.pop(ctx),
                            child: Text('Skip for now', style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                            onPressed: () async {
                              try {
                                await SupabaseService.submitReview(
                                  taskId: taskId,
                                  revieweeId: revieweeId,
                                  rating: rating,
                                  comment: commentCtrl.text,
                                );
                                if (context.mounted) Navigator.pop(ctx);
                                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted successfully!')));
                              } catch (e) {
                                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                              }
                            },
                            child: const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
