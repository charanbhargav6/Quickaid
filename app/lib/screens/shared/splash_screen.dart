import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../main.dart';
import '../../services/supabase_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.6, curve: Curves.easeIn)),
    );
    _scaleAnim = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.8, curve: Curves.elasticOut)),
    );
    _ctrl.forward();
    _redirect();
  }

  void _navigate(String route) {
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.pushReplacementNamed(context, route);
    });
  }

  Future<void> _redirect() async {
    await Future.delayed(const Duration(milliseconds: 2000));
    if (!mounted) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      try {
        // Enforce 30-day relogin rule
        final prefs = await SharedPreferences.getInstance();
        final lastVerified = prefs.getInt('last_verified_at');
        if (lastVerified == null) {
          await SupabaseService.signOut();
          _navigate('/login');
          return;
        }
        
        final lastDate = DateTime.fromMillisecondsSinceEpoch(lastVerified);
        final diff = DateTime.now().difference(lastDate).inDays;
        if (diff >= 30) {
          await SupabaseService.signOut();
          _navigate('/login');
          return;
        }

        final profile = await SupabaseService.getProfile(session.user.id);
        if (!mounted) return;
        final role = profile?['role'] as String? ?? 'seeker';
        if (role == 'admin') {
          _navigate('/admin');
        } else if (role == 'helper') {
          _navigate('/helper');
        } else {
          _navigate('/seeker');
        }
      } catch (_) {
        _navigate('/login');
      }
    } else {
      _navigate('/login');
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0C1220), Color(0xFF1A2540), Color(0xFF0C1220)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: ScaleTransition(
              scale: _scaleAnim,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFF97316).withValues(alpha: 0.5),
                          blurRadius: 30,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.flash_on_rounded, size: 50, color: Colors.white),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'QuickAid',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Fast Help, Trusted People',
                    style: TextStyle(color: Colors.white54, fontSize: 14, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 60),
                  const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Color(0xFFF97316),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
