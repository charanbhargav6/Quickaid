import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/auth_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePass = true;
  String _selectedRole = 'seeker';
  String? _error;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      await SupabaseService.signUp(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        fullName: _nameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        role: _selectedRole,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registration successful! Please check your email to verify your account.')),
      );
      Navigator.pushReplacementNamed(context, '/login');
    } on AuthException catch (e) {
      setState(() { _error = e.message; _loading = false; });
    } catch (e) {
      setState(() { _error = 'Registration failed. Please try again.'; _loading = false; });
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF0C1220), const Color(0xFF1A2540)]
                : [const Color(0xFFF8FAFC), const Color(0xFFEEF2FF)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 40),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF131D30) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.arrow_back_ios_new_rounded,
                        size: 18,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text('Create Account',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontSize: 30, fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('Join QuickAid and get help fast',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 15),
                  ),
                  const SizedBox(height: 32),

                  AuthTextField(
                    controller: _nameCtrl,
                    label: 'Full Name',
                    hint: 'John Doe',
                    icon: Icons.person_outline_rounded,
                    validator: (v) => v!.trim().length >= 2 ? null : 'Enter your full name',
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _emailCtrl,
                    label: 'Email',
                    hint: 'you@example.com',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v!.contains('@') ? null : 'Enter a valid email',
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _phoneCtrl,
                    label: 'Phone (optional)',
                    hint: '+91 98765 43210',
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _passCtrl,
                    label: 'Password',
                    hint: '••••••••',
                    icon: Icons.lock_outline_rounded,
                    obscureText: _obscurePass,
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePass ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                      onPressed: () => setState(() => _obscurePass = !_obscurePass),
                    ),
                    validator: (v) => v!.length >= 6 ? null : 'At least 6 characters',
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    controller: _confirmPassCtrl,
                    label: 'Confirm Password',
                    hint: '••••••••',
                    icon: Icons.lock_outline_rounded,
                    obscureText: true,
                    validator: (v) => v == _passCtrl.text ? null : 'Passwords do not match',
                  ),
                  const SizedBox(height: 24),
                  
                  // Role Selector
                  Text('How do you want to use QuickAid?', style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : Colors.black87)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildRoleCard('Seeker', 'Post tasks', Icons.pan_tool_outlined, isDark),
                      const SizedBox(width: 8),
                      _buildRoleCard('Helper', 'Earn money', Icons.handshake_outlined, isDark),
                      const SizedBox(width: 8),
                      _buildRoleCard('Both', 'Do it all', Icons.sync_alt, isDark),
                    ],
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Row(children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                      ]),
                    ),
                  ],

                  const SizedBox(height: 24),
                  GradientButton(label: 'Create Account', loading: _loading, onPressed: _register),
                  const SizedBox(height: 20),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text('Already have an account? ', style: Theme.of(context).textTheme.bodyMedium),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const Text('Sign In',
                        style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard(String title, String subtitle, IconData icon, bool isDark) {
    final isSelected = _selectedRole == title.toLowerCase();
    final activeColor = const Color(0xFF22C55E);
    
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedRole = title.toLowerCase()),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected 
                ? activeColor.withValues(alpha: 0.1) 
                : (isDark ? const Color(0xFF131D30) : Colors.white),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? activeColor : (isDark ? Colors.white10 : Colors.black12),
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? activeColor : (isDark ? Colors.white54 : Colors.black54), size: 24),
              const SizedBox(height: 6),
              Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isSelected ? activeColor : (isDark ? Colors.white : Colors.black87))),
              const SizedBox(height: 2),
              Text(subtitle, style: TextStyle(fontSize: 10, color: isDark ? Colors.white54 : Colors.black54)),
            ],
          ),
        ),
      ),
    );
  }
}
