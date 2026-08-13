import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../widgets/gradient_button.dart';

class OtpScreen extends StatefulWidget {
  final String email;
  final bool isNewDevice;
  final bool isSignup;
  const OtpScreen({super.key, required this.email, this.isNewDevice = false, this.isSignup = false});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _otpVerified = false;

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    
    if (otp.isEmpty) {
      setState(() => _error = 'Enter a valid OTP');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final type = widget.isSignup 
          ? OtpType.signup 
          : (widget.isNewDevice ? OtpType.magiclink : OtpType.recovery);
          
      final res = await SupabaseService.auth.verifyOTP(
        email: widget.email,
        token: otp,
        type: type,
      );
      
      if (res.session != null || widget.isSignup) {
        if (widget.isSignup) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Verification successful! You can now log in.')),
          );
          Navigator.pushReplacementNamed(context, '/login');
        } else if (!widget.isNewDevice) {
          setState(() {
            _otpVerified = true;
            _error = null;
          });
        } else {
          // New device login successful
          final deviceId = await SupabaseService.getDeviceId();
          await SupabaseService.client.rpc('log_device_login', params: {'p_device_id': deviceId});
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Device verified successfully!')),
          );
          
          final profile = await SupabaseService.getProfile(res.user!.id);
          final role = profile?['role'] ?? 'seeker';
          if (role == 'admin') {
            Navigator.pushReplacementNamed(context, '/admin');
          } else if (role == 'helper') {
            Navigator.pushReplacementNamed(context, '/helper');
          } else {
            Navigator.pushReplacementNamed(context, '/seeker');
          }
        }
      } else {
        setState(() => _error = 'Invalid or expired OTP');
      }
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'An unexpected error occurred');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updatePassword() async {
    final newPass = _newPassCtrl.text;
    final confirmPass = _confirmPassCtrl.text;
    
    if (newPass.length < 6) {
      setState(() => _error = 'Enter a new password (min 6 chars)');
      return;
    }
    if (newPass != confirmPass) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      await SupabaseService.updatePassword(newPass);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password changed successfully!')),
      );
      Navigator.pushReplacementNamed(context, '/login');
    } catch (e) {
      setState(() => _error = 'Failed to update password');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.isSignup ? 'Verify Email' : (widget.isNewDevice 
              ? 'Verify Device' 
              : (_otpVerified ? 'Enter New Password' : 'Reset Password')),
          style: TextStyle(color: theme.colorScheme.onSurface),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!_otpVerified) ...[
              Text(
                widget.isSignup 
                    ? 'Enter the 6-digit registration code sent to\n${widget.email}'
                    : 'Enter the OTP sent to\n${widget.email}',
                style: TextStyle(fontSize: 16, color: theme.colorScheme.onSurface.withOpacity(0.7)),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 8,
                style: TextStyle(color: theme.colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'OTP (6-8 digits)',
                  hintStyle: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.3)),
                  filled: true,
                  fillColor: theme.colorScheme.onSurface.withOpacity(0.05),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ] else ...[
              const SizedBox(height: 16),
              TextField(
                controller: _newPassCtrl,
                obscureText: true,
                style: TextStyle(color: theme.colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'New Password',
                  hintStyle: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.3)),
                  filled: true,
                  fillColor: theme.colorScheme.onSurface.withOpacity(0.05),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _confirmPassCtrl,
                obscureText: true,
                style: TextStyle(color: theme.colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'Confirm New Password',
                  hintStyle: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.3)),
                  filled: true,
                  fillColor: theme.colorScheme.onSurface.withOpacity(0.05),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 24),
            GradientButton(
              label: widget.isNewDevice 
                  ? 'Verify & Login' 
                  : (_otpVerified ? 'Update Password' : 'Verify OTP'),
              onPressed: _loading ? () {} : (_otpVerified ? _updatePassword : _verifyOtp),
              loading: _loading,
            ),
          ],
        ),
      ),
    );
  }
}
