import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../../widgets/gradient_button.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = true;
  bool _saving = false;
  Map<String, dynamic>? _profile;
  
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _selectedRole = 'seeker';

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
          _nameCtrl.text = profile?['full_name'] ?? '';
          _phoneCtrl.text = profile?['phone'] ?? '';
          _selectedRole = profile?['role'] ?? 'seeker';
        });
      }
    } catch (e) {
      debugPrint('Error loading settings: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      final userId = SupabaseService.client.auth.currentUser!.id;
      await SupabaseService.client.from('profiles').update({
        'full_name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'role': _selectedRole,
      }).eq('id', userId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully!')));
        _loadData(); // reload drawer
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Edit Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  
                  const Text('Full Name'),
                  const SizedBox(height: 8),
                  TextField(controller: _nameCtrl, decoration: const InputDecoration(filled: true)),
                  
                  const SizedBox(height: 16),
                  const Text('Phone Number'),
                  const SizedBox(height: 8),
                  TextField(controller: _phoneCtrl, decoration: const InputDecoration(filled: true)),
                  
                  const SizedBox(height: 16),
                  const Text('Role'),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedRole,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'seeker', child: Text('Seeker')),
                          DropdownMenuItem(value: 'helper', child: Text('Helper')),
                          DropdownMenuItem(value: 'both', child: Text('Both')),
                          DropdownMenuItem(value: 'admin', child: Text('Admin (Restricted)')),
                        ],
                        onChanged: (val) {
                          if (val != null && val != 'admin') {
                            setState(() => _selectedRole = val);
                          } else if (val == 'admin') {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cannot self-promote to Admin.')));
                          }
                        },
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  GradientButton(
                    label: 'Save Changes',
                    onPressed: _saving ? () {} : _saveProfile,
                    loading: _saving,
                  ),
                ],
              ),
            ),
    );
  }
}
