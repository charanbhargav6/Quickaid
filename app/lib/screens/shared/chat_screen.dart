import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';

class ChatScreen extends StatefulWidget {
  final String taskId;
  final String otherUserName;
  final String taskTitle;

  const ChatScreen({
    super.key,
    required this.taskId,
    required this.otherUserName,
    required this.taskTitle,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageCtrl = TextEditingController();
  final String _currentUserId = SupabaseService.currentUser?.id ?? '';
  late final Stream<List<Map<String, dynamic>>> _messagesStream;

  @override
  void initState() {
    super.initState();
    _messagesStream = SupabaseService.client
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('task_id', widget.taskId)
        .order('created_at', ascending: true);
  }

  Future<void> _sendMessage() async {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty) return;
    _messageCtrl.clear();
    
    try {
      await SupabaseService.client.from('messages').insert({
        'task_id': widget.taskId,
        'sender_id': _currentUserId,
        'content': text,
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to send: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.otherUserName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(widget.taskTitle, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        backgroundColor: const Color(0xFF22C55E),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'report') {
                await SupabaseService.submitUserReport('', widget.taskId, 'Inappropriate behavior', 'Reported via ChatScreen');
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User reported to admins.')));
              } else if (value == 'cancel') {
                await SupabaseService.cancelTaskWithPenalty(widget.taskId);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task cancelled. Penalty applied.')));
                  Navigator.pop(context);
                }
              } else if (value == 'dispute') {
                final reasonCtrl = TextEditingController();
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Dispute Task', style: TextStyle(color: Colors.red)),
                    content: TextField(
                      controller: reasonCtrl,
                      decoration: const InputDecoration(hintText: 'Enter reason for dispute...'),
                      maxLines: 3,
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                        onPressed: () async {
                          if (reasonCtrl.text.trim().isEmpty) return;
                          await SupabaseService.disputeTask(widget.taskId, reasonCtrl.text.trim());
                          if (mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task disputed. Admin will review soon.')));
                          }
                        },
                        child: const Text('Submit Dispute', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'report', child: Text('Report User')),
              const PopupMenuItem(value: 'cancel', child: Text('Cancel Task (Penalty)')),
              const PopupMenuItem(value: 'dispute', child: Text('Dispute Task', style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: Colors.red,
        onPressed: () async {
          await SupabaseService.triggerSOS(widget.taskId, 'User Location');
          if (mounted) {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('SOS Triggered', style: TextStyle(color: Colors.red)),
                content: const Text('An emergency alert has been sent to the QuickAid admin team. They will contact you shortly.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
                ],
              ),
            );
          }
        },
        child: const Icon(Icons.sos, color: Colors.white, size: 32),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<Map<String, dynamic>>>(
              stream: _messagesStream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final messages = snapshot.data!;
                if (messages.isEmpty) {
                  return const Center(
                    child: Text('No messages yet. Say hi!', style: TextStyle(color: Colors.grey)),
                  );
                }
                
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  reverse: false, // We stream ascending, so new messages are at the bottom
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isMe = msg['sender_id'] == _currentUserId;
                    
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isMe ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isMe ? 16 : 0),
                            bottomRight: Radius.circular(isMe ? 0 : 16),
                          ),
                          border: Border.all(color: isMe ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          msg['content'] ?? '',
                          style: TextStyle(color: isMe ? const Color(0xFF14532D) : const Color(0xFF1E293B)),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade300)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageCtrl,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFF22C55E),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
