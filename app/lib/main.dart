import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/seeker/seeker_dashboard.dart';
import 'screens/helper/helper_dashboard.dart';
import 'screens/admin/admin_dashboard.dart';
import 'screens/shared/splash_screen.dart';

// ── THEME CONTROLLER ─────────────────────────────────────
class ThemeController extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.dark;
  ThemeMode get themeMode => _themeMode;

  void toggleTheme() {
    _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
  }
}

final themeController = ThemeController();

// ── THEME DEFINITIONS ─────────────────────────────────────
class AppTheme {
  static const primaryOrange = Color(0xFFF97316);
  static const primaryOrangeLight = Color(0xFFFB923C);

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF0C1220),
    primaryColor: primaryOrange,
    colorScheme: ColorScheme.dark(
      primary: primaryOrange,
      secondary: primaryOrangeLight,
      surface: const Color(0xFF131D30),
    ),
    cardTheme: CardThemeData(
      color: const Color(0xFF131D30),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF0C1220),
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.white),
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF131D30),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      hintStyle: TextStyle(color: Colors.white38),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: Colors.white),
      bodyMedium: TextStyle(color: Colors.white70),
    ),
    fontFamily: 'Inter',
  );

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    primaryColor: primaryOrange,
    colorScheme: ColorScheme.light(
      primary: primaryOrange,
      secondary: primaryOrangeLight,
      surface: Colors.white,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFF8FAFC),
      elevation: 0,
      iconTheme: IconThemeData(color: Color(0xFF0F172A)),
      titleTextStyle: TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFEEF2FF),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      hintStyle: TextStyle(color: Colors.black38),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: Color(0xFF0F172A)),
      bodyMedium: TextStyle(color: Color(0xFF475569)),
    ),
    fontFamily: 'Inter',
  );

  static LinearGradient get primaryGradient => const LinearGradient(
    colors: [Color(0xFFF97316), Color(0xFFEA580C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static LinearGradient get cardGradientDark => const LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF131D30)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
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
      routes: {
        '/': (ctx) => const SplashScreen(),
        '/login': (ctx) => const LoginScreen(),
        '/register': (ctx) => const RegisterScreen(),
        '/seeker': (ctx) => const SeekerDashboard(),
        '/helper': (ctx) => const HelperDashboard(),
        '/admin': (ctx) => const AdminDashboard(),
      },
      initialRoute: '/',
    );
  }
}
