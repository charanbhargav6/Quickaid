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


  Future<void> _resetPassword() async {
    final email = SupabaseService.client.auth.currentUser?.email;
    if (email == null || email.isEmpty) return;
    
    try {
      await SupabaseService.client.auth.resetPasswordForEmail(email);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password reset email sent!')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final email = SupabaseService.client.auth.currentUser?.email ?? '';

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
                  const Text('Settings', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('Manage your profile and preferences.', style: TextStyle(color: isDark ? Colors.white70 : Colors.black54)),
                  const SizedBox(height: 24),
                  
                  // Profile Information Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Profile Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Divider(height: 32),
                        
                        const Text('Full Name', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _nameCtrl, 
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: isDark ? Colors.black26 : Colors.grey[100],
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          )
                        ),
                        
                        const SizedBox(height: 16),
                        const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _phoneCtrl, 
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: isDark ? Colors.black26 : Colors.grey[100],
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          )
                        ),
                        
                        const SizedBox(height: 16),
                        const Text('Email Address', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: TextEditingController(text: email), 
                          readOnly: true,
                          style: const TextStyle(color: Colors.grey),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: isDark ? Colors.black26 : Colors.grey[100],
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          )
                        ),
                        
                        const SizedBox(height: 16),
                        const Text('Role', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.black26 : Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
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
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Security Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Security', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Divider(height: 32),
                        Text(
                          "To change your password, we'll send a secure reset link to your email.",
                          style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: _resetPassword,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            side: const BorderSide(color: Colors.blue),
                          ),
                          child: const Text('Send Password Reset Email', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
                  GradientButton(
                    label: 'Save Profile Changes',
                    onPressed: _saving ? () {} : _saveProfile,
                    loading: _saving,
                  ),
                ],
              ),
            ),
    );
  }
}
