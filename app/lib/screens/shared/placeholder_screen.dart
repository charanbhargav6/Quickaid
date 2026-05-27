import 'package:flutter/material.dart';
import 'app_drawer.dart';
import '../../services/supabase_service.dart';

class PlaceholderScreen extends StatefulWidget {
  final String title;
  const PlaceholderScreen({super.key, required this.title});

  @override
  State<PlaceholderScreen> createState() => _PlaceholderScreenState();
}

class _PlaceholderScreenState extends State<PlaceholderScreen> {
  Map<String, dynamic> _currentUser = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = SupabaseService.currentUser;
    if (user != null) {
      final profile = await SupabaseService.getProfile(user.id);
      if (profile != null && mounted) {
        setState(() => _currentUser = profile);
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      drawer: _loading ? null : AppDrawer(user: _currentUser),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.build, size: 80, color: Colors.grey),
            const SizedBox(height: 16),
            Text('${widget.title} Screen', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('This feature is coming soon.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
