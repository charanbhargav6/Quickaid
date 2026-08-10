import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../shared/chat_screen.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../widgets/skeleton_loader.dart';
import 'package:geolocator/geolocator.dart';
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

  @override
  void initState() {
    super.initState();
    _loadData();
    _locationTimer = Timer.periodic(const Duration(seconds: 15), (_) => _streamLocation());
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
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
            _openTasks = []; // Fallback to empty if no location
          }
          
          final myTasksRes = await SupabaseService.client
              .from('tasks')
              .select('*, seeker:profiles!seeker_id(full_name)')
              .eq('helper_id', _currentUser['id'])
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search tasks...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
                onChanged: (val) {
                  _searchQuery = val;
                  // Optional: use debounce here instead of reloading on every keystroke
                },
                onSubmitted: (val) => _loadData(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: DropdownButtonFormField<String>(
                      decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0)),
                      value: _category.isEmpty ? null : _category,
                      hint: const Text('Category'),
                      items: const [
                        DropdownMenuItem(value: '', child: Text('All')),
                        DropdownMenuItem(value: 'Cleaning', child: Text('Cleaning')),
                        DropdownMenuItem(value: 'Delivery', child: Text('Delivery')),
                        DropdownMenuItem(value: 'Tech Support', child: Text('Tech Support')),
                        DropdownMenuItem(value: 'Handyman', child: Text('Handyman')),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (val) {
                        setState(() => _category = val ?? '');
                        _loadData();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 1,
                    child: TextField(
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(hintText: 'Min ₹', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0)),
                      onChanged: (val) {
                        _minPay = double.tryParse(val);
                      },
                      onSubmitted: (val) => _loadData(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.check_circle, color: Colors.green, size: 32),
                    onPressed: _loadData,
                  )
                ],
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
      builder: (ctx) => AlertDialog(
        title: const Text('Counter Offer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Task: $title', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Original Pay: ₹$originalPay'),
            const SizedBox(height: 16),
            TextField(
              controller: payCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Your Proposed Pay (₹)', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
            onPressed: () async {
              final proposedPay = double.tryParse(payCtrl.text);
              if (proposedPay == null || proposedPay <= 0) {
                if (context.mounted) ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
                return;
              }
              try {
                await SupabaseService.submitOffer(taskId, proposedPay);
                if (context.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offer submitted!')));
                }
              } catch (e) {
                if (context.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: const Text('Submit', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildOpenTaskCard(Map<String, dynamic> task) {
    final seeker = task['profiles'] ?? task['seeker'];
    final trustScore = seeker != null ? seeker['trust_score'] : null;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(4)),
                      child: Text(task['category'] ?? 'General', style: const TextStyle(color: Color(0xFFEA580C), fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    if (task['distance_km'] != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(4)),
                        child: Row(
                          children: [
                            const Icon(Icons.location_on, size: 12, color: Color(0xFF3B82F6)),
                            const SizedBox(width: 4),
                            Text('${task['distance_km'].toStringAsFixed(1)} km', style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                Text('₹${task['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF22C55E), fontSize: 16)),
              ],
            ),
            const SizedBox(height: 8),
            Text(task['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text(_parseDescription(task['description'] ?? ''), style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
            
            if (_extractImageUrl(task['description']) != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(_extractImageUrl(task['description'])!, height: 150, width: double.infinity, fit: BoxFit.cover),
              ),
            ],
            
            if (seeker != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: const Color(0xFFDCFCE7),
                      child: Text((seeker['full_name'] ?? 'U')[0], style: const TextStyle(color: Color(0xFF15803D), fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Posted by ${seeker['full_name'] ?? 'Unknown'}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          if (trustScore != null)
                            Row(
                              children: [
                                const Icon(Icons.verified, size: 12, color: Colors.blue),
                                const SizedBox(width: 4),
                                Text('Trust Score: $trustScore', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
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
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E), minimumSize: const Size.fromHeight(40)),
                    onPressed: () => _acceptTask(task['id']),
                    child: const Text('Accept Job', style: TextStyle(color: Colors.white)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                    onPressed: () => _showCounterOfferDialog(task['id'], task['title'], double.tryParse(task['pay'].toString()) ?? 0.0),
                    child: const Text('Counter Offer'),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: isCompleted ? const Color(0xFFDCFCE7) : const Color(0xFFDBEAFE), borderRadius: BorderRadius.circular(4)),
                  child: Text(isCompleted ? 'Completed' : 'In Progress', style: TextStyle(color: isCompleted ? const Color(0xFF16A34A) : const Color(0xFF2563EB), fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                Text('₹${task['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF22C55E), fontSize: 16)),
              ],
            ),
            const SizedBox(height: 8),
            Text(task['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text('For: ${task['seeker']?['full_name'] ?? 'Unknown'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
            
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
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                      onPressed: () => _completeTask(task['id']),
                      child: const Text('Mark as Done'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                      icon: const Icon(Icons.chat, size: 16),
                      label: const Text('Chat'),
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
            ] else ...[
              const SizedBox(height: 16),
              OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                onPressed: () => _showReviewDialog(task['id'], task['seeker_id'], task['seeker']?['full_name']),
                child: const Text('Rate Seeker'),
              ),
            ]
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
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          title: Text('Rate $name'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('How was your experience working with this Seeker?', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return IconButton(
                    icon: Icon(
                      index < rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 36,
                    ),
                    onPressed: () => setStateDialog(() => rating = index + 1),
                  );
                }),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: commentCtrl,
                decoration: const InputDecoration(labelText: 'Comment (Optional)', border: OutlineInputBorder()),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
              onPressed: () async {
                try {
                  await SupabaseService.submitReview(
                    taskId: taskId,
                    revieweeId: revieweeId,
                    rating: rating,
                    comment: commentCtrl.text,
                  );
                  if (context.mounted) Navigator.pop(ctx);
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted!')));
                } catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              },
              child: const Text('Submit', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
