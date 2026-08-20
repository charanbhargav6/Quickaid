import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'otp_screen.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/alert_modal.dart';

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

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; });

    try {
      final res = await SupabaseService.signIn(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );

      if (!mounted) return;

      final profile = await SupabaseService.getProfile(res.user!.id);
      final role = profile?['role'] ?? 'seeker';

      if (profile?['is_suspended'] == true) {
        setState(() => _loading = false);
        AlertModal.show(context, title: 'Suspended', message: 'Your account has been suspended. Contact support.', type: AlertType.error);
        return;
      }

      if (!mounted) return;
      if (role == 'admin') {
        Navigator.pushReplacementNamed(context, '/admin');
      } else {
        // Both seeker, helper, and both roles default to the seeker dashboard
        Navigator.pushReplacementNamed(context, '/seeker');
      }

    } on NewDeviceException {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New device detected! Please enter the OTP sent to your email to verify this device.')),
      );
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OtpScreen(email: _emailCtrl.text.trim(), isNewDevice: true)),
      );
    } on AuthException catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Login Error', message: e.message, type: AlertType.error);
    } catch (e) {
      setState(() => _loading = false);
      AlertModal.show(context, title: 'Error', message: e.toString(), type: AlertType.error);
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

  Future<void> _forgotPassword() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your email first, then tap Forgot Password.')),
      );
      return;
    }
    try {
      setState(() => _loading = true);
      await SupabaseService.sendPasswordResetEmail(email);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OTP sent to $email. Please check your inbox.')),
      );
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OtpScreen(email: email)),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send OTP: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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

                  Semantics(
                    label: 'email_input',
                    child: AuthTextField(
                      controller: _emailCtrl,
                      label: 'Email',
                      hint: 'you@example.com',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) => v!.contains('@') ? null : 'Enter a valid email',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Semantics(
                    label: 'password_input',
                    child: AuthTextField(
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
                  ),

                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _forgotPassword,
                      child: const Text('Forgot Password?', style: TextStyle(color: Color(0xFFF97316))),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Semantics(
                    label: 'login_button',
                    child: GradientButton(
                      label: 'Sign In',
                      loading: _loading,
                      onPressed: _login,
                    ),
                  ),
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
                      label: const Text('Sign in with Google', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.blue)),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: isDark ? const Color(0xFF131D30) : Colors.white,
                        side: BorderSide(color: Colors.blue.withValues(alpha: 0.5), width: 1),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _loading ? null : _googleSignIn,
                    ),
                  ),
                  const SizedBox(height: 24),
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
