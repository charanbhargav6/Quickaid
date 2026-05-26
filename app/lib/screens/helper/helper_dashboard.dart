import 'package:flutter/material.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';

class HelperDashboard extends StatefulWidget {
  const HelperDashboard({super.key});

  @override
  State<HelperDashboard> createState() => _HelperDashboardState();
}

class _HelperDashboardState extends State<HelperDashboard> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _openTasks = [];
  List<Map<String, dynamic>> _acceptedTasks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
    // Subscribe to realtime task updates
    SupabaseService.subscribeToTasks((_) => _loadData());
  }

  Future<void> _loadData() async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;

    final profile = await SupabaseService.getProfile(userId);
    final open = await SupabaseService.getOpenTasks();
    final accepted = await SupabaseService.getAcceptedTasks(userId);

    if (mounted) {
      setState(() {
        _profile = profile;
        _openTasks = open;
        _acceptedTasks = accepted;
        _loading = false;
      });
    }
  }

  Future<void> _acceptTask(String taskId) async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;
    await SupabaseService.acceptTask(taskId, userId);
    _loadData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task accepted! 🎉'), backgroundColor: Color(0xFFF97316)),
      );
    }
  }

  Future<void> _completeTask(String taskId) async {
    await SupabaseService.updateTaskStatus(taskId, 'completed');
    _loadData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task completed! Earnings updated.'), backgroundColor: Colors.green),
      );
    }
  }

  Future<void> _logout() async {
    await SupabaseService.signOut();
    if (mounted) Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF131D30) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);

    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
            : IndexedStack(
                index: _currentIndex,
                children: [
                  _buildBrowse(isDark, surfaceColor, textColor),
                  _buildMyJobs(isDark, surfaceColor, textColor),
                  _buildEarnings(isDark, surfaceColor, textColor),
                ],
              ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: const Color(0xFFF97316).withValues(alpha: 0.15),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_rounded), label: 'Browse'),
          NavigationDestination(icon: Icon(Icons.work_rounded), label: 'My Jobs'),
          NavigationDestination(icon: Icon(Icons.payments_rounded), label: 'Earnings'),
        ],
      ),
    );
  }

  Widget _buildBrowse(bool isDark, Color surfaceColor, Color textColor) {
    return RefreshIndicator(
      color: const Color(0xFFF97316),
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Helper Mode', style: TextStyle(color: const Color(0xFFF97316), fontSize: 13, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('Available Tasks', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
                ]),
              ),
              IconButton(
                icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: textColor.withValues(alpha: 0.5)),
                onPressed: () => themeController.toggleTheme(),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Hero Stats
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
            ),
            child: Row(
              children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Your Earnings', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('₹${(_profile?['total_earnings'] ?? 0).toStringAsFixed(0)}',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                ])),
                Column(children: [
                  const Text('Trust', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                    child: Text('${_profile?['trust_score'] ?? 80}%',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Switch & Logout row
          Row(children: [
            Expanded(
              child: _actionChip('Switch to Seeker', Icons.swap_horiz_rounded, surfaceColor, textColor,
                onTap: () => Navigator.pushReplacementNamed(context, '/seeker'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _actionChip('Logout', Icons.logout_rounded, surfaceColor, Colors.red, onTap: _logout),
            ),
          ]),
          const SizedBox(height: 24),

          Text('${_openTasks.length} Open Tasks Near You',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),

          if (_openTasks.isEmpty)
            _emptyState('No open tasks right now', textColor)
          else
            ..._openTasks.map((task) => _openTaskCard(task, surfaceColor, textColor)),
        ],
      ),
    );
  }

  Widget _buildMyJobs(bool isDark, Color surfaceColor, Color textColor) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('My Jobs', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text('Tasks you have accepted', style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13)),
        const SizedBox(height: 20),
        if (_acceptedTasks.isEmpty)
          _emptyState('No accepted jobs yet', textColor)
        else
          ..._acceptedTasks.map((task) => _acceptedTaskCard(task, surfaceColor, textColor)),
      ],
    );
  }

  Widget _buildEarnings(bool isDark, Color surfaceColor, Color textColor) {
    final completed = _acceptedTasks.where((t) => t['status'] == 'completed').length;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Earnings', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
          ),
          child: Column(children: [
            const Text('Total Earned', style: TextStyle(color: Colors.white70, fontSize: 14)),
            const SizedBox(height: 8),
            Text('₹${(_profile?['total_earnings'] ?? 0).toStringAsFixed(2)}',
              style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _earningsStat('Jobs Done', completed.toString()),
              _earningsStat('Wallet', '₹${(_profile?['wallet_balance'] ?? 0).toStringAsFixed(0)}'),
            ]),
          ]),
        ),
      ],
    );
  }

  Widget _earningsStat(String label, String value) {
    return Column(children: [
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
    ]);
  }

  Widget _actionChip(String label, IconData icon, Color bg, Color textColor, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: textColor == Colors.red ? Colors.red : const Color(0xFFF97316), size: 18),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(color: textColor, fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Widget _openTaskCard(Map<String, dynamic> task, Color bg, Color textColor) {
    final seeker = task['profiles'] as Map<String, dynamic>?;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(
            radius: 18, backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
            child: Text((seeker?['full_name'] ?? 'U')[0].toUpperCase(),
              style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(seeker?['full_name'] ?? 'Unknown', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
            Text('Trust: ${seeker?['trust_score'] ?? '?'}%', style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 11)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(gradient: AppTheme.primaryGradient, borderRadius: BorderRadius.circular(10)),
            child: Text('₹${task['pay'] ?? 0}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
          ),
        ]),
        const SizedBox(height: 12),
        Text(task['title'] ?? '', style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w700)),
        if (task['description'] != null && task['description'].toString().isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(task['description'], style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
        const SizedBox(height: 12),
        Row(children: [
          if (task['location_name'] != null) ...[
            Icon(Icons.location_on_outlined, size: 14, color: textColor.withValues(alpha: 0.4)),
            const SizedBox(width: 4),
            Text(task['location_name'], style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 12)),
            const Spacer(),
          ] else
            const Spacer(),
          SizedBox(
            height: 36,
            child: ElevatedButton(
              onPressed: () => _acceptTask(task['id']),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Accept', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _acceptedTaskCard(Map<String, dynamic> task, Color bg, Color textColor) {
    final isCompleted = task['status'] == 'completed';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(task['title'] ?? 'Task', style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w700))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: (isCompleted ? Colors.green : Colors.orange).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              (task['status'] ?? 'accepted').toUpperCase(),
              style: TextStyle(color: isCompleted ? Colors.green : Colors.orange, fontSize: 10, fontWeight: FontWeight.w700),
            ),
          ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          Icon(Icons.payments_outlined, size: 16, color: const Color(0xFFF97316)),
          const SizedBox(width: 4),
          Text('₹${task['pay'] ?? 0}', style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
          const Spacer(),
          if (!isCompleted)
            SizedBox(
              height: 34,
              child: ElevatedButton(
                onPressed: () => _completeTask(task['id']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Mark Complete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
            ),
        ]),
      ]),
    );
  }

  Widget _emptyState(String msg, Color textColor) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(top: 60),
        child: Column(children: [
          Icon(Icons.inbox_rounded, size: 64, color: textColor.withValues(alpha: 0.2)),
          const SizedBox(height: 12),
          Text(msg, style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 16)),
        ]),
      ),
    );
  }
}
