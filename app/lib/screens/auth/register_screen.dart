import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/alert_modal.dart';
import 'otp_screen.dart';

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
  
  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; });

    try {
      await SupabaseService.signUp(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        fullName: _nameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        role: 'both',
      );
      if (!mounted) return;
      
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => OtpScreen(
            email: _emailCtrl.text.trim(),
            isSignup: true,
          ),
        ),
      );
    } on AuthException catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Registration Error', message: e.message, type: AlertType.error);
    } catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Error', message: 'Registration failed. Please try again.', type: AlertType.error);
    }
  }

  Future<void> _googleSignIn() async {
    setState(() { _loading = true; });
    try {
      await SupabaseService.signInWithGoogle();
    } on AuthException catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Sign-In Error', message: e.message, type: AlertType.error);
    } catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Error', message: 'Google Sign-in failed.', type: AlertType.error);
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
                  const SizedBox(height: 24),
                  GradientButton(label: 'Create Account', loading: _loading, onPressed: _register),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: Divider(color: isDark ? Colors.white24 : Colors.black26)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text('OR', style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontSize: 12)),
                      ),
                      Expanded(child: Divider(color: isDark ? Colors.white24 : Colors.black26)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.g_mobiledata, size: 32, color: Colors.blue),
                      label: const Text('Sign up with Google', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.blue)),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: isDark ? const Color(0xFF131D30) : Colors.white,
                        side: BorderSide(color: Colors.blue.withValues(alpha: 0.5), width: 1),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _loading ? null : _googleSignIn,
                    ),
                  ),
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
}
