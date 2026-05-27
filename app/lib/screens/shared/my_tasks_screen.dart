import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';

class MyTasksScreen extends StatefulWidget {
  const MyTasksScreen({super.key});

  @override
  State<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends State<MyTasksScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _tasks = [];
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final userId = SupabaseService.client.auth.currentUser!.id;
      final profile = await SupabaseService.getProfile(userId);
      
      List<Map<String, dynamic>> tasks;
      if (profile?['role'] == 'helper') {
        tasks = List<Map<String, dynamic>>.from(await SupabaseService.client
            .from('tasks')
            .select()
            .eq('helper_id', userId)
            .order('created_at', ascending: false));
      } else {
        tasks = List<Map<String, dynamic>>.from(await SupabaseService.client
            .from('tasks')
            .select()
            .eq('seeker_id', userId)
            .order('created_at', ascending: false));
      }

      if (mounted) {
        setState(() {
          _profile = profile;
          _tasks = tasks;
        });
      }
    } catch (e) {
      debugPrint('Error loading tasks: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Tasks')),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tasks.isEmpty
              ? const Center(child: Text('No tasks found.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tasks.length,
                  itemBuilder: (context, index) {
                    final t = _tasks[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(t['title'] ?? 'Untitled Task', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(t['description'] ?? ''),
                        trailing: Chip(label: Text(t['status'] ?? 'open')),
                      ),
                    );
                  },
                ),
    );
  }
}
