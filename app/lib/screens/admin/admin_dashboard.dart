import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../../widgets/skeleton_loader.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:typed_data';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  bool _loading = true;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _tasks = [];
  Map<String, dynamic> _currentUser = {};
  int _activeTab = 0; // 0: Overview, 1: Users, 2: Tasks

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final user = SupabaseService.currentUser;
      if (user != null) {
        final profile = await SupabaseService.getProfile(user.id);
        if (profile != null) _currentUser = profile;
      }
      _users = await SupabaseService.getAllProfiles();
      _tasks = await SupabaseService.getOpenTasks(); // We can fetch all tasks, but getOpenTasks is fine for now
    } catch (e) {
      debugPrint('Error loading admin data: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleSuspend(String userId, bool currentStatus) async {
    await SupabaseService.setSuspendStatus(userId, !currentStatus);
    _loadData();
  }

  Future<void> _changeRole(String userId, String newRole) async {
    await SupabaseService.changeRole(userId, newRole);
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: SkeletonListView());
    }

    final totalUsers = _users.length;
    final totalTasks = _tasks.length;
    final activeHelpers = _users.where((u) => u['role'] == 'helper').length;
    final double totalEarnings = _users.fold(0.0, (sum, u) => sum + (num.tryParse(u['total_earnings']?.toString() ?? '0') ?? 0));

    return Scaffold(
      drawer: AppDrawer(user: _currentUser),
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: Column(
        children: [
          // Custom Tab Bar
          Container(
            color: Colors.white,
            child: Row(
              children: [
                _buildTab('Overview', 0),
                _buildTab('Users', 1),
                _buildTab('Tasks', 2),
              ],
            ),
          ),
          Expanded(
            child: _activeTab == 0
                ? _buildOverviewTab(totalUsers, totalTasks, activeHelpers, totalEarnings)
                : _activeTab == 1
                    ? _buildUsersTab()
                    : _buildTasksTab(),
          ),
        ],
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
            border: Border(
              bottom: BorderSide(
                color: isActive ? const Color(0xFF22C55E) : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
              color: isActive ? const Color(0xFF1E293B) : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOverviewTab(int users, int tasks, int helpers, double earnings) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: _buildStatCard('Total Users', users.toString(), Icons.people, Colors.blue)),
            const SizedBox(width: 16),
            Expanded(child: _buildStatCard('Open Tasks', tasks.toString(), Icons.task, Colors.orange)),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildStatCard('Active Helpers', helpers.toString(), Icons.engineering, Colors.purple)),
            const SizedBox(width: 16),
            Expanded(child: _buildStatCard('Earnings', '₹${earnings.toStringAsFixed(0)}', Icons.attach_money, Colors.green)),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
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
      ),
    );
  }

  Widget _buildUsersTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _users.length,
      itemBuilder: (ctx, i) {
        final u = _users[i];
        final isSuspended = u['is_suspended'] == true;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFFDCFCE7),
              child: Text((u['full_name'] ?? 'U')[0], style: const TextStyle(color: Color(0xFF15803D))),
            ),
            title: Text(u['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${u['email']}\nRole: ${u['role']}'),
            isThreeLine: true,
            trailing: PopupMenuButton<String>(
              onSelected: (val) {
                if (val == 'suspend') {
                  _toggleSuspend(u['id'], isSuspended);
                } else if (val.startsWith('role_')) {
                  _changeRole(u['id'], val.split('_')[1]);
                }
              },
              itemBuilder: (ctx) => [
                PopupMenuItem(value: 'suspend', child: Text(isSuspended ? 'Unsuspend' : 'Suspend')),
                const PopupMenuItem(value: 'role_seeker', child: Text('Make Seeker')),
                const PopupMenuItem(value: 'role_helper', child: Text('Make Helper')),
                const PopupMenuItem(value: 'role_admin', child: Text('Make Admin')),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTasksTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Post New Task', style: TextStyle(color: Colors.white)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF22C55E),
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: _showCreateTaskDialog,
          ),
        ),
        Expanded(
          child: _tasks.isEmpty
              ? const Center(child: Text('No open tasks right now.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tasks.length,
                  itemBuilder: (ctx, i) {
                    final t = _tasks[i];
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
                                  decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(4)),
                                  child: Text(t['category'] ?? 'General', style: const TextStyle(color: Color(0xFFEA580C), fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                                Text('₹${t['pay']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF22C55E), fontSize: 16)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(t['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Text(t['description'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => _acceptTask(t['id']),
                                    child: const Text('Accept as Helper'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  void _showCreateTaskDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final payCtrl = TextEditingController();
    final locCtrl = TextEditingController();
    XFile? pickedFile;
    Uint8List? fileBytes;
    bool isUploading = false;
    String errorText = '';
    LatLng selectedLocation = const LatLng(12.9692, 79.1559); // Default VIT Campus

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          title: const Text('Post New Task', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Task Title (e.g. Move Luggage)')),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description (Optional)')),
                const SizedBox(height: 12),
                TextField(controller: locCtrl, decoration: const InputDecoration(labelText: 'Location Name (e.g. Main Gate)')),
                const SizedBox(height: 12),
                TextField(controller: payCtrl, decoration: const InputDecoration(labelText: 'Pay (₹) - Min ₹50'), keyboardType: TextInputType.number),
                const SizedBox(height: 16),
                const Text('Task Location Pin', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 4),
                SizedBox(
                  height: 150,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: selectedLocation,
                        initialZoom: 15.0,
                        onTap: (tapPosition, point) {
                          setStateDialog(() {
                            selectedLocation = point;
                          });
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.example.app',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: selectedLocation,
                              width: 40,
                              height: 40,
                              child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(top: 4, bottom: 16),
                  child: Text('Tap map to drop pin', style: TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
                ),
                OutlinedButton.icon(
                  icon: const Icon(Icons.camera_alt),
                  label: Text(pickedFile == null ? 'Attach Photo (Optional)' : 'Photo Selected'),
                  onPressed: () async {
                    final picker = ImagePicker();
                    final xfile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
                    if (xfile != null) {
                      final bytes = await xfile.readAsBytes();
                      setStateDialog(() {
                        pickedFile = xfile;
                        fileBytes = bytes;
                      });
                    }
                  },
                ),
                
                if (errorText.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(errorText, style: const TextStyle(color: Colors.red, fontSize: 12)),
                ],
              ],
            ),
          ),
          actions: [
            if (!isUploading) TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Colors.grey))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
              onPressed: isUploading ? null : () async {
                if (titleCtrl.text.trim().isEmpty) {
                  setStateDialog(() => errorText = 'Task Title is required');
                  return;
                }
                final payAmount = double.tryParse(payCtrl.text) ?? 0.0;
                if (payAmount < 50) {
                  setStateDialog(() => errorText = 'Minimum pay is ₹50');
                  return;
                }
                // Removing wallet balance check for Admin to ensure they can create tasks freely.
                
                setStateDialog(() { isUploading = true; errorText = ''; });
                
                String finalDesc = descCtrl.text.isEmpty ? 'Task created by admin' : descCtrl.text;
                
                try {
                  if (fileBytes != null) {
                    final fileName = '${DateTime.now().millisecondsSinceEpoch}_${pickedFile!.name}';
                    await Supabase.instance.client.storage
                        .from('task_images')
                        .uploadBinary(fileName, fileBytes!);
                    final imageUrl = Supabase.instance.client.storage.from('task_images').getPublicUrl(fileName);
                    finalDesc += '\n\n[IMAGE:$imageUrl]';
                  }

                  await SupabaseService.createTask({
                    'title': titleCtrl.text,
                    'description': finalDesc,
                    'pay': payAmount,
                    'category': 'other',
                    'location_name': locCtrl.text.trim().isEmpty ? 'Campus' : locCtrl.text.trim(),
                    'latitude': selectedLocation.latitude,
                    'longitude': selectedLocation.longitude,
                    'seeker_id': _currentUser['id'],
                  });
                  
                  if (context.mounted) Navigator.pop(ctx);
                  _loadData();
                } catch (e) {
                  setStateDialog(() {
                    isUploading = false;
                    errorText = 'Failed to post task: $e';
                  });
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to post task: $e'), backgroundColor: Colors.red));
                }
              },
              child: isUploading 
                ? const SkeletonLoader(width: 16, height: 16)
                : const Text('Post Task', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _acceptTask(String taskId) async {
    await SupabaseService.acceptTask(taskId, _currentUser['id']);
    _loadData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task accepted successfully')));
    }
  }
}
