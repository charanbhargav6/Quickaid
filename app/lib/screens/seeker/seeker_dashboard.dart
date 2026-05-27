import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../shared/chat_screen.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:typed_data';

class SeekerDashboard extends StatefulWidget {
  const SeekerDashboard({super.key});

  @override
  State<SeekerDashboard> createState() => _SeekerDashboardState();
}

class _SeekerDashboardState extends State<SeekerDashboard> {
  bool _loading = true;
  List<Map<String, dynamic>> _myTasks = [];
  Map<String, dynamic> _currentUser = {};

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
      
      final tasks = await SupabaseService.client
          .from('tasks')
          .select('*, helper:profiles!helper_id(full_name, phone)')
          .eq('seeker_id', _currentUser['id'])
          .order('created_at', ascending: false);
      
      _myTasks = List<Map<String, dynamic>>.from(tasks);
    } catch (e) {
      debugPrint('Error loading seeker data: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _myTasks.where((t) => t['status'] != 'completed' && t['status'] != 'cancelled').length;

    return Scaffold(
      drawer: AppDrawer(user: _currentUser),
      appBar: AppBar(
        title: const Text('Seeker Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
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

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final status = task['status'] as String;
    Color statusColor;
    String statusText;
    
    switch (status) {
      case 'completed': statusColor = Colors.green; statusText = 'Completed'; break;
      case 'accepted': statusColor = Colors.blue; statusText = 'In Progress'; break;
      default: statusColor = Colors.orange; statusText = 'Open'; break;
    }

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
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(statusText, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
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
            if (task['helper'] != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    const CircleAvatar(radius: 16, child: Icon(Icons.engineering, size: 16)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Helper', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          Text(task['helper']['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    if (status == 'completed')
                      OutlinedButton(
                        onPressed: () => _showReviewDialog(task['id'], task['helper_id'], task['helper']['full_name']),
                        child: const Text('Rate Helper'),
                      )
                    else if (status == 'accepted')
                      OutlinedButton.icon(
                        icon: const Icon(Icons.chat, size: 16),
                        label: const Text('Chat'),
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
              ),
            ]
          ],
        ),
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
    final amountCtrl = TextEditingController(text: '500');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Funds (Demo)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter amount to add to your wallet (Max ₹500 per transaction):'),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount (₹)', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text) ?? 0.0;
              if (amount <= 0 || amount > 500) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount up to ₹500')));
                return;
              }
              Navigator.pop(ctx);
              await SupabaseService.addDemoFunds(amount);
              _loadData();
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('₹$amount added to wallet!')));
            },
            child: const Text('Add Funds', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showCreateTaskDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final payCtrl = TextEditingController();
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
                TextField(controller: payCtrl, decoration: const InputDecoration(labelText: 'Pay (₹) - Min ₹50'), keyboardType: TextInputType.number),
                const SizedBox(height: 16),
                const Text('Task Location', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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
                final currentBalance = double.tryParse(_currentUser['wallet_balance']?.toString() ?? '0') ?? 0.0;
                if (currentBalance < payAmount) {
                  setStateDialog(() => errorText = 'Insufficient wallet balance. Please add funds.');
                  return;
                }
                
                setStateDialog(() { isUploading = true; errorText = ''; });
                
                String finalDesc = descCtrl.text.isEmpty ? 'Needs help ASAP' : descCtrl.text;
                
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
                    'location_name': 'Campus', // Kept for legacy
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
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Post Task', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
