import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../../widgets/skeleton_loader.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _notifications = [];

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
      
      if (mounted) {
        setState(() {
          _profile = profile;
        });
      }
      
      await _loadNotifications();
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadNotifications() async {
    try {
      final userId = SupabaseService.client.auth.currentUser?.id;
      if (userId == null) return;

      final response = await SupabaseService.client
          .from('notifications')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _notifications = List<Map<String, dynamic>>.from(response);
        });
      }
    } catch (e) {
      debugPrint('Error loading notifications list: $e');
    }
  }

  Future<void> _markAsRead(String id) async {
    try {
      await SupabaseService.client
          .from('notifications')
          .update({'is_read': true})
          .eq('id', id);
      
      // Update locally for speed
      setState(() {
        final index = _notifications.indexWhere((n) => n['id'] == id);
        if (index != -1) {
          _notifications[index]['is_read'] = true;
        }
      });
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  Future<void> _markAllAsRead() async {
    final userId = SupabaseService.client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await SupabaseService.client
          .from('notifications')
          .update({'is_read': true})
          .eq('user_id', userId)
          .eq('is_read', false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All notifications marked as read')),
      );
      
      await _loadNotifications();
    } catch (e) {
      debugPrint('Error marking all as read: $e');
    }
  }

  Future<void> _deleteNotification(String id) async {
    try {
      await SupabaseService.client
          .from('notifications')
          .delete()
          .eq('id', id);

      setState(() {
        _notifications.removeWhere((n) => n['id'] == id);
      });
    } catch (e) {
      debugPrint('Error deleting notification: $e');
      await _loadNotifications();
    }
  }

  void _handleNotificationTap(Map<String, dynamic> notification) {
    _markAsRead(notification['id']);

    if (notification['data'] != null) {
      final route = notification['data']['route'];
      if (route != null && route.toString().isNotEmpty) {
        Navigator.pushNamed(context, route.toString());
      }
    }
  }

  String _getRelativeTime(String dateStr) {
    try {
      final dateTime = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inSeconds < 60) {
        return 'Just now';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}h ago';
      } else if (difference.inDays < 7) {
        return '${difference.inDays}d ago';
      } else {
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      }
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final unreadCount = _notifications.where((n) => n['is_read'] == false).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange.shade800,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ]
          ],
        ),
        actions: [
          if (unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.mark_chat_read_outlined),
              tooltip: 'Mark all as read',
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const SkeletonListView()
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: _notifications.isEmpty
                  ? Center(
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.notifications_active_outlined,
                              size: 72,
                              color: isDarkMode ? Colors.grey.shade700 : Colors.grey.shade300,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'You are all caught up!',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'We will notify you when there is an update.',
                              style: TextStyle(
                                color: isDarkMode ? Colors.grey.shade500 : Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) {
                        final notif = _notifications[index];
                        final bool isUnread = notif['is_read'] == false;

                        return Dismissible(
                          key: Key(notif['id']),
                          direction: DismissDirection.endToStart,
                          onDismissed: (direction) => _deleteNotification(notif['id']),
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 24.0),
                            color: Colors.red.shade900,
                            child: const Icon(Icons.delete_sweep, color: Colors.white, size: 28),
                          ),
                          child: InkWell(
                            onTap: () => _handleNotificationTap(notif),
                            child: Container(
                              color: isUnread
                                  ? (isDarkMode
                                      ? Colors.orange.withOpacity(0.04)
                                      : Colors.orange.withOpacity(0.05))
                                  : Colors.transparent,
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Indicator Dot or Icon
                                  Container(
                                    margin: const EdgeInsets.only(top: 4.0, right: 12.0),
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isUnread
                                          ? Colors.orange.shade800
                                          : Colors.transparent,
                                    ),
                                  ),
                                  // Content
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          notif['title'] ?? 'Alert',
                                          style: TextStyle(
                                            fontSize: 16.0,
                                            fontWeight: isUnread ? FontWeight.bold : FontWeight.w500,
                                            color: isDarkMode ? Colors.white : Colors.black87,
                                          ),
                                        ),
                                        const SizedBox(height: 4.0),
                                        Text(
                                          notif['body'] ?? '',
                                          style: TextStyle(
                                            fontSize: 14.0,
                                            color: isDarkMode
                                                ? (isUnread ? Colors.grey.shade300 : Colors.grey.shade400)
                                                : (isUnread ? Colors.grey.shade800 : Colors.grey.shade600),
                                          ),
                                        ),
                                        const SizedBox(height: 6.0),
                                        Text(
                                          _getRelativeTime(notif['created_at']),
                                          style: TextStyle(
                                            fontSize: 11.0,
                                            color: isDarkMode ? Colors.grey.shade600 : Colors.grey.shade500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Chevron or delete button
                                  if (notif['data'] != null && notif['data']['route'] != null)
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      size: 14,
                                      color: isDarkMode ? Colors.grey.shade600 : Colors.grey.shade400,
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
