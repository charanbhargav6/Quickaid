import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';

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
    final activeCount = _myTasks.where((t) => t['status'] == 'open' || t['status'] == 'accepted').length;
    final completedCount = _myTasks.where((t) => t['status'] == 'completed').length;

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
                // Stats
                Row(
                  children: [
                    Expanded(child: _buildStatCard('Active Tasks', activeCount.toString(), Icons.pending_actions, Colors.orange)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildStatCard('Completed', completedCount.toString(), Icons.task_alt, Colors.green)),
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
            Text(task['description'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 14)),
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
                  ],
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }

  void _showCreateTaskDialog() {
    final titleCtrl = TextEditingController();
    final payCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Post New Task', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Task Title')),
            const SizedBox(height: 12),
            TextField(controller: payCtrl, decoration: const InputDecoration(labelText: 'Pay (₹)'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF22C55E)),
            onPressed: () async {
              if (titleCtrl.text.isNotEmpty && payCtrl.text.isNotEmpty) {
                await SupabaseService.createTask({
                  'title': titleCtrl.text,
                  'description': 'Needs help ASAP',
                  'category': 'Others',
                  'pay': double.tryParse(payCtrl.text) ?? 0,
                  'location_name': 'Campus',
                  'seeker_id': _currentUser['id'],
                });
                if (context.mounted) Navigator.pop(ctx);
                _loadData();
              }
            },
            child: const Text('Post Task', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
