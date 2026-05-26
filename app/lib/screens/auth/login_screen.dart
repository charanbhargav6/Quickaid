import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/auth_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePass = true;
  String? _error;

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final res = await SupabaseService.signIn(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );

      if (!mounted) return;

      final profile = await SupabaseService.getProfile(res.user!.id);
      final role = profile?['role'] ?? 'seeker';

      if (profile?['is_suspended'] == true) {
        setState(() { _error = 'Your account has been suspended. Contact support.'; _loading = false; });
        return;
      }

      if (!mounted) return;
      if (role == 'admin') {
        Navigator.pushReplacementNamed(context, '/admin');
      } else if (role == 'helper') {
        Navigator.pushReplacementNamed(context, '/helper');
      } else {
        Navigator.pushReplacementNamed(context, '/seeker');
      }

    } on AuthException catch (e) {
      setState(() { _error = e.message; _loading = false; });
    } catch (e) {
      setState(() { _error = 'An unexpected error occurred. Please try again.'; _loading = false; });
    }
  }

  Future<void> _forgotPassword() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your email first, then tap Forgot Password.')),
      );
      return;
    }
    await SupabaseService.sendPasswordResetEmail(email);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Password reset email sent! Check your inbox.')),
    );
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
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
                  const SizedBox(height: 60),
                  // Logo
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 34),
                  ),
                  const SizedBox(height: 28),
                  Text('Welcome back',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontSize: 30, fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('Sign in to your QuickAid account',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 15),
                  ),
                  const SizedBox(height: 40),

                  AuthTextField(
                    controller: _emailCtrl,
                    label: 'Email',
                    hint: 'you@example.com',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v!.contains('@') ? null : 'Enter a valid email',
                  ),
                  const SizedBox(height: 16),
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
                    validator: (v) => v!.length >= 6 ? null : 'Password must be at least 6 characters',
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Row(children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                      ]),
                    ),
                  ],

                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _forgotPassword,
                      child: const Text('Forgot Password?', style: TextStyle(color: Color(0xFFF97316))),
                    ),
                  ),
                  const SizedBox(height: 8),
                  GradientButton(
                    label: 'Sign In',
                    loading: _loading,
                    onPressed: _login,
                  ),
                  const SizedBox(height: 20),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text("Don't have an account? ",
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/register'),
                      child: const Text('Sign Up',
                        style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.w700),
                      ),
                    ),
                  ]),
                  // Theme toggle at bottom
                  const SizedBox(height: 32),
                  Center(
                    child: IconButton(
                      icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                        color: isDark ? Colors.white38 : Colors.black38,
                      ),
                      onPressed: () => themeController.toggleTheme(),
                      tooltip: 'Toggle Theme',
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
