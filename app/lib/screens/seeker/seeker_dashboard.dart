import 'package:flutter/material.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';

class SeekerDashboard extends StatefulWidget {
  const SeekerDashboard({super.key});

  @override
  State<SeekerDashboard> createState() => _SeekerDashboardState();
}

class _SeekerDashboardState extends State<SeekerDashboard> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _myTasks = [];
  bool _loadingProfile = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) return;

    final profile = await SupabaseService.getProfile(userId);
    final tasks = await SupabaseService.getMyTasks(userId);

    if (mounted) {
      setState(() {
        _profile = profile;
        _myTasks = tasks;
        _loadingProfile = false;
      });
    }
  }

  Future<void> _logout() async {
    await SupabaseService.signOut();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/login');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF131D30) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);

    return Scaffold(
      body: SafeArea(
        child: _loadingProfile
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
            : IndexedStack(
                index: _currentIndex,
                children: [
                  _buildHome(isDark, surfaceColor, textColor),
                  _buildMyTasks(isDark, surfaceColor, textColor),
                  _buildProfile(isDark, surfaceColor, textColor),
                ],
              ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: const Color(0xFFF97316).withValues(alpha: 0.15),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.task_alt_rounded), label: 'My Tasks'),
          NavigationDestination(icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildHome(bool isDark, Color surfaceColor, Color textColor) {
    return RefreshIndicator(
      color: const Color(0xFFF97316),
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFFF97316),
                child: Text(
                  (_profile?['full_name'] ?? 'U')[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Hello, ${_profile?['full_name']?.split(' ')[0] ?? 'User'}!',
                      style: TextStyle(color: textColor, fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                    Text('What do you need help with?',
                      style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: textColor.withValues(alpha: 0.5)),
                onPressed: () => themeController.toggleTheme(),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Hero Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Post a Task', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('Need something done? Post it and helpers will come to you.',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => _showCreateTaskDialog(),
                  icon: const Icon(Icons.add_rounded, color: Color(0xFFF97316)),
                  label: const Text('Create Task', style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Stats
          Row(
            children: [
              _statCard('Tasks', _myTasks.length.toString(), Icons.task_alt_rounded, surfaceColor, textColor),
              const SizedBox(width: 12),
              _statCard('Trust', '${_profile?['trust_score'] ?? 80}%', Icons.verified_rounded, surfaceColor, textColor),
              const SizedBox(width: 12),
              _statCard('Wallet', '₹${(_profile?['wallet_balance'] ?? 0).toStringAsFixed(0)}', Icons.account_balance_wallet_rounded, surfaceColor, textColor),
            ],
          ),
          const SizedBox(height: 28),

          // Quick Actions
          Text('Quick Actions', style: TextStyle(color: textColor, fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          _actionTile('Switch to Helper', Icons.swap_horiz_rounded, surfaceColor, textColor,
            onTap: () => Navigator.pushReplacementNamed(context, '/helper'),
          ),
          const SizedBox(height: 10),
          _actionTile('Change Password', Icons.lock_reset_rounded, surfaceColor, textColor,
            onTap: () => _showChangePasswordDialog(),
          ),
          const SizedBox(height: 10),
          _actionTile('Logout', Icons.logout_rounded, surfaceColor, Colors.red, onTap: _logout),
        ],
      ),
    );
  }

  Widget _buildMyTasks(bool isDark, Color surfaceColor, Color textColor) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('My Tasks', style: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text('Tasks you have posted', style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13)),
        const SizedBox(height: 20),
        if (_myTasks.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 60),
              child: Column(children: [
                Icon(Icons.inbox_rounded, size: 64, color: textColor.withValues(alpha: 0.2)),
                const SizedBox(height: 12),
                Text('No tasks yet', style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 16)),
              ]),
            ),
          )
        else
          ..._myTasks.map((task) => _taskCard(task, surfaceColor, textColor)),
      ],
    );
  }

  Widget _buildProfile(bool isDark, Color surfaceColor, Color textColor) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 20),
        Center(
          child: CircleAvatar(
            radius: 44,
            backgroundColor: const Color(0xFFF97316),
            child: Text(
              (_profile?['full_name'] ?? 'U')[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(_profile?['full_name'] ?? 'User',
            style: TextStyle(color: textColor, fontSize: 22, fontWeight: FontWeight.w700),
          ),
        ),
        Center(
          child: Text(SupabaseService.currentUser?.email ?? '',
            style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 14),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF97316).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              (_profile?['role'] ?? 'seeker').toUpperCase(),
              style: const TextStyle(color: Color(0xFFF97316), fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 32),
        _profileRow('Phone', _profile?['phone'] ?? 'Not set', Icons.phone_outlined, surfaceColor, textColor),
        _profileRow('Trust Score', '${_profile?['trust_score'] ?? 80}/100', Icons.verified_outlined, surfaceColor, textColor),
        _profileRow('Wallet', '₹${(_profile?['wallet_balance'] ?? 0).toStringAsFixed(2)}', Icons.wallet_outlined, surfaceColor, textColor),
        _profileRow('Tasks Done', '${_profile?['tasks_completed'] ?? 0}', Icons.check_circle_outline, surfaceColor, textColor),
        _profileRow('Total Earned', '₹${(_profile?['total_earnings'] ?? 0).toStringAsFixed(2)}', Icons.payments_outlined, surfaceColor, textColor),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color bg, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Column(children: [
          Icon(icon, color: const Color(0xFFF97316), size: 26),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _actionTile(String label, IconData icon, Color bg, Color textColor, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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

  Widget _taskCard(Map<String, dynamic> task, Color bg, Color textColor) {
    final statusColors = {
      'open': Colors.blue, 'accepted': Colors.orange, 'in_progress': Colors.purple, 'completed': Colors.green, 'cancelled': Colors.red,
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(task['title'] ?? 'Task', style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w700))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: (statusColors[task['status']] ?? Colors.grey).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                (task['status'] ?? 'open').toUpperCase(),
                style: TextStyle(color: statusColors[task['status']] ?? Colors.grey, fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
          ]),
          const SizedBox(height: 6),
          Text(task['description'] ?? '', style: TextStyle(color: textColor.withValues(alpha: 0.5), fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 10),
          Row(children: [
            Icon(Icons.payments_outlined, size: 16, color: const Color(0xFFF97316)),
            const SizedBox(width: 4),
            Text('₹${task['pay'] ?? 0}', style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700)),
            const SizedBox(width: 16),
            Icon(Icons.location_on_outlined, size: 16, color: textColor.withValues(alpha: 0.4)),
            const SizedBox(width: 4),
            Text(task['location_name'] ?? 'Remote', style: TextStyle(color: textColor.withValues(alpha: 0.4), fontSize: 12)),
          ]),
        ],
      ),
    );
  }

  Widget _profileRow(String label, String value, IconData icon, Color bg, Color textColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Icon(icon, color: const Color(0xFFF97316), size: 22),
        const SizedBox(width: 14),
        Expanded(child: Text(label, style: TextStyle(color: textColor.withValues(alpha: 0.6), fontSize: 14))),
        Text(value, style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600)),
      ]),
    );
  }

  void _showCreateTaskDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final payCtrl = TextEditingController();
    final locCtrl = TextEditingController();
    String category = 'delivery';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 20),
              const Text('Create a New Task', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 20),
              TextField(controller: titleCtrl, decoration: const InputDecoration(hintText: 'Task Title')),
              const SizedBox(height: 12),
              TextField(controller: descCtrl, maxLines: 3, decoration: const InputDecoration(hintText: 'Description')),
              const SizedBox(height: 12),
              TextField(controller: payCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: 'Pay (₹)', prefixText: '₹ ')),
              const SizedBox(height: 12),
              TextField(controller: locCtrl, decoration: const InputDecoration(hintText: 'Location (optional)')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: category,
                items: ['delivery', 'cleaning', 'repair', 'tutoring', 'errand', 'other']
                    .map((c) => DropdownMenuItem(value: c, child: Text(c[0].toUpperCase() + c.substring(1))))
                    .toList(),
                onChanged: (v) => category = v!,
                decoration: const InputDecoration(hintText: 'Category'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleCtrl.text.isEmpty || payCtrl.text.isEmpty) return;
                    await SupabaseService.createTask({
                      'title': titleCtrl.text.trim(),
                      'description': descCtrl.text.trim(),
                      'category': category,
                      'pay': double.tryParse(payCtrl.text) ?? 0,
                      'location_name': locCtrl.text.trim().isEmpty ? null : locCtrl.text.trim(),
                      'seeker_id': SupabaseService.currentUser!.id,
                    });
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    if (!mounted) return;
                    _loadData();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Post Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
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
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'New Password')),
            const SizedBox(height: 12),
            TextField(controller: confirmCtrl, obscureText: true, decoration: const InputDecoration(hintText: 'Confirm Password')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (passCtrl.text.length < 6 || passCtrl.text != confirmCtrl.text) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords must match and be 6+ chars')));
                return;
              }
              await SupabaseService.updatePassword(passCtrl.text);
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) {
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
