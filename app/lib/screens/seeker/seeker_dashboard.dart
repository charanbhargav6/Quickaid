import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../shared/chat_screen.dart';
import '../shared/helper_profile_screen.dart';
import '../shared/task_tracking_screen.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:ui';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/alert_modal.dart';
import '../../widgets/post_task_modal.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:async';

class SeekerDashboard extends StatefulWidget {
  final bool openPostTask;
  const SeekerDashboard({super.key, this.openPostTask = false});

  @override
  State<SeekerDashboard> createState() => _SeekerDashboardState();
}

class _SeekerDashboardState extends State<SeekerDashboard> {
  bool _loading = true;
  List<Map<String, dynamic>> _myTasks = [];
  List<Map<String, dynamic>> _activeHelpers = [];
  List<Map<String, dynamic>> _incomingOffers = [];
  Map<String, dynamic> _currentUser = {};
  Position? _currentPosition;
  RealtimeChannel? _realtimeChannel;
  final Set<String> _reviewedTaskIds = {};

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupRealtime();
    if (widget.openPostTask) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showCreateTaskDialog();
      });
    }
  }

  void _setupRealtime() {
    _realtimeChannel = SupabaseService.client.channel('seeker-dashboard-realtime')
      // ── Track helper live location ──────────────────────
      .onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'profiles',
        callback: (payload) {
          final newRecord = payload.newRecord;
          final updatedId = newRecord['id'];
          
          final assignedTasks = _myTasks.where((t) => t['status'] == 'accepted' && t['helper_id'] == updatedId);
          if (assignedTasks.isNotEmpty) {
            setState(() {
              for (var task in _myTasks) {
                if (task['helper_id'] == updatedId && task['helper'] != null) {
                  task['helper']['current_lat'] = newRecord['current_lat'];
                  task['helper']['current_lng'] = newRecord['current_lng'];
                }
              }
            });
          }
        }
      )
      // ── Task INSERTs: new task posted from the app or web ─
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'tasks',
        callback: (payload) {
          final inserted = payload.newRecord;
          final seekerId = _currentUser['id'];
          if (inserted['seeker_id'] != seekerId) return;

          setState(() {
            // Avoid duplicates (the initial load might already have it)
            final exists = _myTasks.any((t) => t['id'] == inserted['id']);
            if (!exists) {
              _myTasks.insert(0, inserted);
            }
          });
        }
      )
      // ── Task UPDATEs: status changes (accepted, completed, etc.) ──
      .onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'tasks',
        callback: (payload) {
          final updated = payload.newRecord;
          final seekerId = _currentUser['id'];
          if (updated['seeker_id'] != seekerId) return;

          setState(() {
            final idx = _myTasks.indexWhere((t) => t['id'] == updated['id']);
            if (idx != -1) {
              // Preserve nested helper object which realtime doesn't return
              final helper = _myTasks[idx]['helper'];
              _myTasks[idx] = {...updated, 'helper': helper};
            } else {
              _myTasks.insert(0, updated);
            }
          });

          // Show in-app snackbar for key status changes
          final status = updated['status'] as String?;
          if (status == 'accepted' && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('A helper accepted your task: "${updated['title']}"'),
                backgroundColor: const Color(0xFF10B981),
                behavior: SnackBarBehavior.floating,
              ),
            );
          } else if (status == 'completed' && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('"${updated['title']}" has been marked complete!'),
                backgroundColor: const Color(0xFF3B82F6),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        }
      )
      .subscribe();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      await Future.any([
        Future(() async {
          final user = SupabaseService.currentUser;
          if (user != null) {
            final profile = await SupabaseService.getProfile(user.id);
            if (profile != null) _currentUser = profile;
          }
          
          final tasks = await SupabaseService.client
              .from('tasks')
              .select('*, helper:profiles!helper_id(full_name, phone, trust_score, current_lat, current_lng)')
              .eq('seeker_id', _currentUser['id'])
              .order('created_at', ascending: false);
          
          _myTasks = List<Map<String, dynamic>>.from(tasks);
          
          bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
          LocationPermission permission = await Geolocator.checkPermission();
          
          if (permission == LocationPermission.denied) {
            permission = await Geolocator.requestPermission();
          }
          
          if (serviceEnabled && (permission == LocationPermission.whileInUse || permission == LocationPermission.always)) {
            Position position = await Geolocator.getCurrentPosition();
            _currentPosition = position;
            _activeHelpers = await SupabaseService.getNearbyHelpers(position.latitude, position.longitude, 10.0);
          } else {
            _activeHelpers = [];
            _currentPosition = null;
          }

          _incomingOffers = await SupabaseService.getIncomingOffers();
        }),
        Future.delayed(const Duration(seconds: 15), () => throw Exception('Timeout loading data'))
      ]);
    } catch (e) {
      debugPrint('Error loading seeker data: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _myTasks.where((t) => t['status'] != 'completed' && t['status'] != 'cancelled').length;
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
          title: const Text('Seeker Dashboard'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
          ],
        ),
        body: _loading
            ? const SkeletonListView()
            : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Stats & Wallet
                Row(
                  children: [
                    Expanded(child: _buildStatCard('Active Tasks', activeCount.toString(), Icons.pending_actions, Colors.orange)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Wallet Balance', style: TextStyle(color: Colors.white70, fontSize: 12)),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  icon: const Icon(Icons.add_circle, color: Colors.greenAccent, size: 20),
                                  onPressed: _showAddFundsDialog,
                                )
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('₹${_currentUser['wallet_balance'] ?? '0.0'}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Post button
                ElevatedButton.icon(
                  icon: const Icon(Icons.add, color: Colors.white),
                  label: const Text('Post New Task', style: TextStyle(color: Colors.white, fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _showCreateTaskDialog,
                ),
                const SizedBox(height: 24),
                
                // Active Helpers Map
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Active Helpers Nearby', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(12)),
                      child: Text('${_activeHelpers.length} Online', style: const TextStyle(color: Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                if (_currentPosition == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text('Location unavailable. Cannot show nearby helpers.')),
                  )
                else
                  SizedBox(
                    height: 200,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                          initialZoom: 14.0,
                        ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.example.app',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                              width: 40,
                              height: 40,
                              child: const Icon(Icons.my_location, color: Colors.blue, size: 30),
                            ),
                            ..._activeHelpers.where((h) => h['current_lat'] != null && h['current_lng'] != null).map((h) {
                              return Marker(
                                point: LatLng(h['current_lat'].toDouble(), h['current_lng'].toDouble()),
                                width: 60,
                                height: 60,
                                child: Column(
                                  children: [
                                    const Icon(Icons.directions_run, color: Color(0xFF2563EB), size: 36),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF2563EB))),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(h['full_name']?.toString().split(' ')[0] ?? 'Helper', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black)),
                                          if (h['trust_score'] != null && h['trust_score'] >= 30 && h['trust_score'] <= 50)
                                            const Padding(
                                              padding: EdgeInsets.only(left: 2.0),
                                              child: Icon(Icons.warning, color: Colors.amber, size: 10),
                                            )
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                            ..._myTasks.where((t) => t['status'] == 'accepted' && t['helper']?['current_lat'] != null).map((t) {
                              final h = t['helper'];
                              return Marker(
                                point: LatLng(h['current_lat'].toDouble(), h['current_lng'].toDouble()),
                                width: 60,
                                height: 60,
                                child: Column(
                                  children: [
                                    const Icon(Icons.directions_car, color: Colors.green, size: 36),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.green, width: 2)),
                                      child: Text('En Route: ${h['full_name']?.toString().split(' ')[0] ?? ''}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green)),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Incoming Offers
                if (_incomingOffers.isNotEmpty) ...[
                  const Text('Incoming Counter-Offers', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
                  const SizedBox(height: 12),
                  ..._incomingOffers.map((o) => _buildOfferCard(o)),
                  const SizedBox(height: 24),
                ],

                // Task List
                const Text('My Recent Tasks', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (_myTasks.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                    child: const Text('No tasks posted yet.', style: TextStyle(color: Color(0xFF64748B))),
                  )
                else
                  ..._myTasks.map((t) => _buildTaskCard(t)),
              ],
            ),
          ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
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

  Widget _buildOfferCard(Map<String, dynamic> offer) {
    final taskTitle = offer['tasks']?['title'] ?? 'Task';
    final originalPay = offer['tasks']?['pay'] ?? 0.0;
    final proposedPay = offer['proposed_pay'] ?? 0.0;
    final helperName = offer['profiles']?['full_name'] ?? 'Helper';
    final trustScore = offer['profiles']?['trust_score'] ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Colors.blue, width: 2)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(taskTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: const BoxDecoration(color: Color(0xFFFEF08A), borderRadius: BorderRadius.all(Radius.circular(4))),
                  child: const Text('Pending Offer', style: TextStyle(color: Color(0xFF854D0E), fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('$helperName (Trust Score: $trustScore/100) proposed a new price.', style: const TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 12),
            Row(
              children: [
                Text('₹$originalPay', style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey)),
                const SizedBox(width: 12),
                Text('₹$proposedPay', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green)),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E), minimumSize: const Size.fromHeight(40)),
              onPressed: () async {
                try {
                  await SupabaseService.acceptOffer(
                    offer['id'], 
                    offer['task_id'], 
                    offer['helper_id'], 
                    double.tryParse(proposedPay.toString()) ?? 0.0, 
                    double.tryParse(originalPay.toString()) ?? 0.0,
                    offer['profiles']?['fcm_token'] ?? ''
                  );
                  _loadData();
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offer Accepted!')));
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              },
              child: const Text('Accept Offer', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    ).animate().fade(duration: 400.ms).slideY(begin: 0.1, end: 0, duration: 400.ms, curve: Curves.easeOutQuad);
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final status = task['status'] as String;
    Color statusColor;
    String statusText;
    
    switch (status) {
      case 'completed': statusColor = Colors.green; statusText = 'Completed'; break;
      case 'accepted': statusColor = Colors.blue; statusText = 'In Progress'; break;
      default: statusColor = Colors.orange; statusText = 'Open'; break;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: status == 'accepted' ? Colors.blue.withValues(alpha: 0.3) : (isDark ? Colors.white12 : Colors.grey[200]!)),
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
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 8, height: 8, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(statusText, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Text('₹${task['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 18)),
                    if (status == 'open') ...[
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => _deleteTaskConfirm(task['id']),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                          child: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                        ),
                      ),
                    ],
                  ],
                ),
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
            if (task['helper'] != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const CircleAvatar(radius: 20, backgroundColor: Colors.blue, child: Icon(Icons.engineering, size: 20, color: Colors.white)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Helper Assigned', style: TextStyle(fontSize: 11, color: isDark ? Colors.white54 : const Color(0xFF64748B))),
                          GestureDetector(
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (ctx) => HelperProfileScreen(helperId: task['helper_id'])));
                            },
                            child: Row(
                              children: [
                                Text(task['helper']['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.blue)),
                                if (task['helper']['trust_score'] != null && task['helper']['trust_score'] >= 30 && task['helper']['trust_score'] <= 50)
                                  const Padding(
                                    padding: EdgeInsets.only(left: 4.0),
                                    child: Icon(Icons.warning, color: Colors.amber, size: 16),
                                  )
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (status == 'completed')
                      _reviewedTaskIds.contains(task['id'])
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle, size: 16, color: Colors.green),
                                  SizedBox(width: 4),
                                  Text('Reviewed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            )
                          : ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                              onPressed: () => _showReviewDialog(task['id'], task['helper_id'], task['helper']['full_name']),
                              child: const Text('Rate Helper'),
                            )
                    else if (status == 'accepted')
                      Column(
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 12)),
                            icon: const Icon(Icons.map, size: 16),
                            label: const Text('Track Helper', style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (ctx) => TaskTrackingScreen(
                                    taskId: task['id'],
                                    helperId: task['helper_id'],
                                    seekerId: SupabaseService.currentUser!.id,
                                    taskLat: task['latitude'] != null ? (task['latitude'] as num).toDouble() : 0.0,
                                    taskLng: task['longitude'] != null ? (task['longitude'] as num).toDouble() : 0.0,
                                    taskTitle: task['title'],
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 4),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 12)),
                            icon: const Icon(Icons.chat, size: 16),
                            label: const Text('Chat', style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (ctx) => ChatScreen(
                                    taskId: task['id'],
                                    otherUserName: task['helper']['full_name'] ?? 'Helper',
                                    taskTitle: task['title'],
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ]
          ],
        ),
      ),
    ).animate().fade(duration: 300.ms).slideX(begin: 0.1, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  void _deleteTaskConfirm(String taskId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await SupabaseService.deleteTask(taskId);
              _loadData();
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task deleted')));
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
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
              const Text('How was your experience?', style: TextStyle(fontWeight: FontWeight.bold)),
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
                  setState(() => _reviewedTaskIds.add(taskId));
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

  void _showAddFundsDialog() {
    final amountCtrl = TextEditingController();
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
                  decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.account_balance_wallet, color: Color(0xFF10B981), size: 40),
                ),
                const SizedBox(height: 16),
                const Text('Add Funds to Wallet', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Max ₹500 per demo transaction', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                const SizedBox(height: 24),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    prefixText: '₹ ',
                    prefixStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
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
                          backgroundColor: const Color(0xFF10B981),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          final amount = double.tryParse(amountCtrl.text) ?? 0.0;
                          if (amount <= 0 || amount > 500) {
                            AlertModal.show(context, title: 'Invalid Amount', message: 'Please enter a valid amount up to ₹500', type: AlertType.warning);
                            return;
                          }
                          Navigator.pop(ctx);
                          await SupabaseService.addDemoFunds(amount);
                          _loadData();
                          if (mounted) AlertModal.show(context, title: 'Success', message: '₹$amount added to wallet!', type: AlertType.success);
                        },
                        child: const Text('Top Up', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
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

  void _showCreateTaskDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (ctx) => PostTaskModal(
        currentUser: _currentUser,
        onTaskPosted: () {
          _loadData();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Task posted successfully!', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green),
            );
          }
        },
        onAddFunds: _showAddFundsDialog,
      ),
    );
  }
}
