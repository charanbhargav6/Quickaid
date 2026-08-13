import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'services/notification_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/seeker/seeker_dashboard.dart';
import 'screens/helper/helper_dashboard.dart';
import 'screens/admin/admin_dashboard.dart';
import 'screens/shared/splash_screen.dart';
import 'screens/shared/my_tasks_screen.dart';
import 'screens/shared/earnings_screen.dart';
import 'screens/shared/messages_screen.dart';
import 'screens/shared/notifications_screen.dart';
import 'screens/shared/settings_screen.dart';
import 'screens/seeker/review_screen.dart';
import 'screens/settings/legal_screen.dart';
import 'screens/settings/support_screen.dart';
import 'screens/auth/otp_screen.dart';

// ── THEME CONTROLLER ─────────────────────────────────────
class ThemeController extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.light;
  ThemeMode get themeMode => _themeMode;

  void toggleTheme() {
    _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
  }
}

final themeController = ThemeController();

// ── THEME DEFINITIONS ─────────────────────────────────────
class AppTheme {
  static const primaryBlue = Color(0xFF009FFC);
  static const primaryBlueDark = Color(0xFF008BE0);
  static const bgLight = Color(0xFFECEFF1); // Mist Gray
  static const textPrimary = Color(0xFF1E293B);
  static const textSecondary = Color(0xFF64748B);

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: bgLight,
    primaryColor: primaryBlue,
    colorScheme: const ColorScheme.light(
      primary: primaryBlue,
      secondary: primaryBlueDark,
      surface: Colors.white,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: bgLight,
      elevation: 0,
      iconTheme: IconThemeData(color: textPrimary),
      titleTextStyle: TextStyle(color: textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      hintStyle: const TextStyle(color: textSecondary),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: textPrimary),
      bodyMedium: TextStyle(color: textSecondary),
    ),
    fontFamily: 'Inter',
  );

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF161B22), // Deep Charcoal from screenshot
    primaryColor: primaryBlue,
    colorScheme: const ColorScheme.dark(
      primary: primaryBlue,
      secondary: primaryBlueDark,
      surface: Color(0xFF21262D),
    ),
    cardTheme: CardThemeData(
      color: const Color(0xFF21262D), // Card background from screenshot
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFF30363D)),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF161B22),
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.white),
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF21262D),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF30363D)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFF30363D)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: Colors.white),
      bodyMedium: TextStyle(color: Color(0xFF94A3B8)),
    ),
    fontFamily: 'Inter',
  );

  static LinearGradient get primaryGradient => const LinearGradient(
    colors: [Color(0xFF009FFC), Color(0xFF008BE0)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static LinearGradient get sidebarGradient => const LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

// ── MAIN ─────────────────────────────────────────────────
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');

  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
  
  // Initialize Firebase and Notifications safely
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    // Don't await NotificationService so it doesn't block runApp if FCM hangs
    NotificationService.initialize().catchError((e) {
      debugPrint('Failed to initialize notifications: $e');
    });
  } catch (e) {
    debugPrint('Failed to initialize Firebase: $e');
  }

  runApp(const QuickAidApp());
}

class QuickAidApp extends StatefulWidget {
  const QuickAidApp({super.key});

  @override
  State<QuickAidApp> createState() => _QuickAidAppState();
}

class _QuickAidAppState extends State<QuickAidApp> {
  @override
  void initState() {
    super.initState();
    themeController.addListener(() => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QuickAid',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeController.themeMode,
      home: const SplashScreen(),
      routes: {
        '/login': (ctx) => const LoginScreen(),
        '/register': (ctx) => const RegisterScreen(),
        '/otp': (context) => const OtpScreen(email: ''),
        '/seeker': (context) => const SeekerDashboard(),
        '/my_tasks': (context) => const MyTasksScreen(),
        '/post_task': (context) => const SeekerDashboard(openPostTask: true),
        '/earnings': (context) => const EarningsScreen(),
        '/messages': (context) => const MessagesScreen(),
        '/notifications': (context) => const NotificationsScreen(),
        '/settings': (context) => const SettingsScreen(),
        '/review': (context) => const ReviewScreen(),
        '/helper': (ctx) => const HelperDashboard(),
        '/admin': (ctx) => const AdminDashboard(),
        '/legal': (ctx) => const LegalScreen(),
        '/support': (ctx) => const SupportScreen(),
      },
      initialRoute: '/',
    );
  }
}
