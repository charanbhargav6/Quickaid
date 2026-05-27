import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../../main.dart';

class AppDrawer extends StatelessWidget {
  final Map<String, dynamic> user;
  
  const AppDrawer({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final role = user['role'] as String? ?? 'seeker';
    final name = user['full_name'] ?? 'User';
    final email = user['email'] ?? '';
    
    return Drawer(
      child: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.sidebarGradient,
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Brand
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha:0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('⚡', style: TextStyle(fontSize: 20)),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'QuickAid',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Navigation
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    _DrawerItem(icon: Icons.dashboard_outlined, label: 'Dashboard', active: true, onTap: () => Navigator.pop(context)),
                    _DrawerItem(icon: Icons.task_alt, label: 'My Tasks', onTap: () {}),
                    if (role == 'seeker' || role == 'admin')
                      _DrawerItem(icon: Icons.add_box_outlined, label: 'Post Task', onTap: () {}),
                    if (role == 'helper' || role == 'admin')
                      _DrawerItem(icon: Icons.account_balance_wallet_outlined, label: 'Earnings', onTap: () {}),
                    _DrawerItem(icon: Icons.message_outlined, label: 'Messages', badge: 3, onTap: () {}),
                    _DrawerItem(icon: Icons.notifications_none, label: 'Notifications', badge: 2, onTap: () {}),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Divider(color: Colors.white24, height: 1),
                    ),
                    _DrawerItem(icon: Icons.settings_outlined, label: 'Settings', onTap: () {}),
                  ],
                ),
              ),
              
              // Logout
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: _DrawerItem(
                  icon: Icons.logout,
                  label: 'Logout',
                  color: Colors.white54,
                  onTap: () async {
                    await SupabaseService.client.auth.signOut();
                    if (context.mounted) {
                      Navigator.pushReplacementNamed(context, '/login');
                    }
                  },
                ),
              ),
              
              // User Card
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha:0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: Colors.white.withValues(alpha:0.2),
                          child: Text(name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: Colors.greenAccent,
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF166534), width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    Text(email, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.greenAccent,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        role.toUpperCase(),
                        style: const TextStyle(color: Color(0xFF14532D), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final int? badge;
  final VoidCallback onTap;
  final Color? color;

  const _DrawerItem({
    required this.icon,
    required this.label,
    this.active = false,
    this.badge,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: active ? Colors.white.withValues(alpha:0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon, color: color ?? (active ? Colors.white : Colors.white70), size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: color ?? (active ? Colors.white : Colors.white70),
                  fontWeight: active ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }
}
