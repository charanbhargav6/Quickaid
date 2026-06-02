import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../shared/chat_screen.dart';
import '../../widgets/skeleton_loader.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _chatTasks = [];
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
      
      // Get tasks where user is seeker or helper, AND helper_id is not null (so chat exists)
      final tasks = List<Map<String, dynamic>>.from(await SupabaseService.client
          .from('tasks')
          .select()
          .or('seeker_id.eq.$userId,helper_id.eq.$userId')
          .not('helper_id', 'is', null)
          .order('created_at', ascending: false));

      if (mounted) {
        setState(() {
          _profile = profile;
          _chatTasks = tasks;
        });
      }
    } catch (e) {
      debugPrint('Error loading chats: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const SkeletonListView()
          : _chatTasks.isEmpty
              ? const Center(child: Text('No active chats. Complete a task connection first!'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _chatTasks.length,
                  itemBuilder: (context, index) {
                    final t = _chatTasks[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue.shade100,
                          child: const Icon(Icons.chat, color: Colors.blue),
                        ),
                        title: Text(t['title'] ?? 'Untitled Task', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Status: ${t['status']}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => ChatScreen(
                              taskId: t['id'],
                              taskTitle: t['title'] ?? 'Untitled Task',
                              otherUserName: 'Chat Room', // Placeholder for now
                            )),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
