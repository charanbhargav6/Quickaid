import 'package:flutter/material.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _allUsers = [];
  List<Map<String, dynamic>> _allTasks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;

    final profile = await SupabaseService.getProfile(userId);
    List<Map<String, dynamic>> users = [];
    List<Map<String, dynamic>> tasks = [];

    try {
      users = await SupabaseService.getAllUsers();
      tasks = await SupabaseService.getOpenTasks();
    } catch (_) {}

    if (mounted) {
      setState(() {
        _profile = profile;
        _allUsers = users;
        _allTasks = tasks;
        _loading = false;
      });
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
                  _buildOverview(isDark, surfaceColor, textColor),
                  _buildUsers(isDark, surfaceColor, textColor),
                  _buildSettings(isDark, surfaceColor, textColor),
                ],
              ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: const Color(0xFFF97316).withValues(alpha: 0.15),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_rounded), label: 'Overview'),
          NavigationDestination(icon: Icon(Icons.people_rounded), label: 'Users'),
          NavigationDestination(icon: Icon(Icons.settings_rounded), label: 'Settings'),
        ],
      ),
    );
  }

  Widget _buildOverview(bool isDark, Color surfaceColor, Color textColor) {
    final totalUsers = _allUsers.length;
    final activeHelpers = _allUsers.where((u) => u['role'] == 'helper' || u['role'] == 'both').length;
    final openTasks = _allTasks.length;
    final suspended = _allUsers.where((u) => u['is_suspended'] == true).length;

    return RefreshIndicator(
      color: const Color(0xFFF97316),
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Admin Panel', style: TextStyle(color: Color(0xFFF97316), fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Welcome, ${_profile?['full_name']?.split(' ')[0] ?? 'Admin'}',
                  style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800),
                ),
              ]),
            ),
            IconButton(
              icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: textColor.withValues(alpha: 0.5)),
              onPressed: () => themeController.toggleTheme(),
            ),
          ]),
          const SizedBox(height: 24),

          // Stats Grid
          Row(children: [
            _statCard('Total Users', totalUsers.toString(), Icons.people_rounded, const Color(0xFF6366F1), surfaceColor, textColor),
            const SizedBox(width: 12),
            _statCard('Active Helpers', activeHelpers.toString(), Icons.handshake_rounded, const Color(0xFF10B981), surfaceColor, textColor),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            _statCard('Open Tasks', openTasks.toString(), Icons.task_rounded, const Color(0xFFF97316), surfaceColor, textColor),
            const SizedBox(width: 12),
            _statCard('Suspended', suspended.toString(), Icons.block_rounded, const Color(0xFFEF4444), surfaceColor, textColor),
          ]),
          const SizedBox(height: 28),

          // Platform Health
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Platform Health', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _healthRow('Database', 'Connected', Colors.green),
              _healthRow('Realtime', 'Active', Colors.green),
              _healthRow('Auth', 'Operational', Colors.green),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildUsers(bool isDark, Color surfaceColor, Color textColor) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('User Management', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text('${_allUsers.length} registered users', style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13)),
        const SizedBox(height: 20),
        ..._allUsers.map((user) => _userCard(user, surfaceColor, textColor)),
      ],
    );
  }

  Widget _buildSettings(bool isDark, Color surfaceColor, Color textColor) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Admin Settings', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 24),
        _settingsTile('Change Password', Icons.lock_reset_rounded, surfaceColor, textColor, onTap: _showChangePasswordDialog),
        const SizedBox(height: 10),
        _settingsTile('Toggle Theme', isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, surfaceColor, textColor,
          onTap: () => themeController.toggleTheme(),
        ),
        const SizedBox(height: 10),
        _settingsTile('Logout', Icons.logout_rounded, surfaceColor, Colors.red, onTap: _logout),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color accent, Color bg, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: accent, size: 22),
          ),
          const SizedBox(height: 14),
          Text(value, style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 12)),
        ]),
      ),
    );
  }

  Widget _healthRow(String service, String status, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 10),
        Text(service, style: const TextStyle(color: Colors.white70, fontSize: 14)),
        const Spacer(),
        Text(status, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
      ]),
    );
  }

  Widget _userCard(Map<String, dynamic> user, Color bg, Color textColor) {
    final isSuspended = user['is_suspended'] == true;
    final roleColors = {
      'admin': const Color(0xFFEF4444), 'helper': const Color(0xFF6366F1),
      'seeker': const Color(0xFF10B981), 'both': const Color(0xFFF97316),
    };
    final role = user['role'] ?? 'seeker';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: isSuspended ? Border.all(color: Colors.red.withValues(alpha: 0.3)) : null,
      ),
      child: Row(children: [
        CircleAvatar(
          radius: 22,
          backgroundColor: (roleColors[role] ?? Colors.grey).withValues(alpha: 0.2),
          child: Text(
            (user['full_name'] ?? 'U')[0].toUpperCase(),
            style: TextStyle(color: roleColors[role] ?? Colors.grey, fontWeight: FontWeight.bold, fontSize: 18),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(user['full_name'] ?? 'Unknown', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 15)),
              if (isSuspended) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(4)),
                  child: const Text('SUSPENDED', style: TextStyle(color: Colors.red, fontSize: 8, fontWeight: FontWeight.w700)),
                ),
              ],
            ]),
            const SizedBox(height: 2),
            Text('${role.toUpperCase()} · Trust: ${user['trust_score'] ?? '?'}%',
              style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 12),
            ),
          ]),
        ),
        PopupMenuButton<String>(
          icon: Icon(Icons.more_vert_rounded, color: textColor.withValues(alpha: 0.4)),
          onSelected: (action) async {
            switch (action) {
              case 'suspend':
                await SupabaseService.setUserSuspended(user['id'], !isSuspended);
                _loadData();
                break;
              case 'make_admin':
                await SupabaseService.setUserRole(user['id'], 'admin');
                _loadData();
                break;
              case 'make_helper':
                await SupabaseService.setUserRole(user['id'], 'helper');
                _loadData();
                break;
              case 'make_seeker':
                await SupabaseService.setUserRole(user['id'], 'seeker');
                _loadData();
                break;
            }
          },
          itemBuilder: (ctx) => [
            PopupMenuItem(value: 'suspend', child: Text(isSuspended ? 'Unsuspend' : 'Suspend')),
            const PopupMenuItem(value: 'make_admin', child: Text('Make Admin')),
            const PopupMenuItem(value: 'make_helper', child: Text('Make Helper')),
            const PopupMenuItem(value: 'make_seeker', child: Text('Make Seeker')),
          ],
        ),
      ]),
    );
  }

  Widget _settingsTile(String label, IconData icon, Color bg, Color textColor, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          Icon(icon, color: textColor == Colors.red ? Colors.red : const Color(0xFFF97316), size: 22),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: TextStyle(color: textColor, fontSize: 15, fontWeight: FontWeight.w600))),
          Icon(Icons.chevron_right_rounded, color: textColor.withValues(alpha: 0.3)),
        ]),
      ),
    );
  }

  void _showChangePasswordDialog() {
    final passCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Change Password'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'New Password')),
          const SizedBox(height: 12),
          TextField(controller: confirmCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'Confirm Password')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (passCtrl.text.length < 6 || passCtrl.text != confirmCtrl.text) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords must match and be 6+ chars')));
                return;
              }
              await SupabaseService.updatePassword(passCtrl.text);
              if (mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated!')));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316)),
            child: const Text('Update', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
