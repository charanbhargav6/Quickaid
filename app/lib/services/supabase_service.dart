import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static bool isMockMode = true;

  static SupabaseClient get client {
    if (isMockMode) throw Exception("Running in offline mock mode.");
    return Supabase.instance.client;
  }
  
  static GoTrueClient get auth {
    if (isMockMode) throw Exception("Running in offline mock mode.");
    return client.auth;
  }

  // ── LOCAL MOCK STATE ──────────────────────────────────────
  static Map<String, dynamic>? _mockCurrentUser;

  static final List<Map<String, dynamic>> _mockProfiles = [
    {
      'id': 'admin-id',
      'email': 'admin@quickaid.com',
      'full_name': 'Main Admin',
      'phone': '+91 99999 99999',
      'role': 'admin',
      'trust_score': 100,
      'wallet_balance': 10000.0,
      'tasks_completed': 0,
      'total_earnings': 0.0,
      'is_suspended': false,
    },
    {
      'id': 'helper-id',
      'email': 'helper@quickaid.com',
      'full_name': 'John Helper',
      'phone': '+91 88888 88888',
      'role': 'helper',
      'trust_score': 94,
      'wallet_balance': 1500.0,
      'tasks_completed': 8,
      'total_earnings': 2400.0,
      'is_suspended': false,
    },
    {
      'id': 'seeker-id',
      'email': 'seeker@quickaid.com',
      'full_name': 'Sarah Seeker',
      'phone': '+91 77777 77777',
      'role': 'seeker',
      'trust_score': 88,
      'wallet_balance': 5000.0,
      'tasks_completed': 3,
      'total_earnings': 0.0,
      'is_suspended': false,
    },
  ];

  static final List<Map<String, dynamic>> _mockTasks = [
    {
      'id': 'task-1',
      'title': 'Campus Document Delivery',
      'description': 'Deliver examination answer scripts from Admin Block to Room 102. Must be done securely.',
      'category': 'delivery',
      'pay': 200.0,
      'location_name': 'Campus Admin Block',
      'seeker_id': 'seeker-id',
      'helper_id': null,
      'status': 'open',
      'created_at': '2026-05-26T08:00:00Z',
      'profiles': {
        'full_name': 'Sarah Seeker',
        'trust_score': 88,
        'avatar_url': null,
      }
    },
    {
      'id': 'task-2',
      'title': 'Hostel Room Fan Repair',
      'description': 'Ceiling fan making squeaking noise, needs lubrication or capacitor replacement.',
      'category': 'repair',
      'pay': 350.0,
      'location_name': 'Hostel-3 Room 45',
      'seeker_id': 'seeker-id',
      'helper_id': 'helper-id',
      'status': 'accepted',
      'created_at': '2026-05-26T07:30:00Z',
      'profiles': {
        'full_name': 'Sarah Seeker',
        'trust_score': 88,
        'avatar_url': null,
      }
    },
  ];

  // ── AUTH ────────────────────────────────────────────────
  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    if (isMockMode) {
      final newId = 'user-${Random().nextInt(100000)}';
      final newProfile = {
        'id': newId,
        'email': email,
        'full_name': fullName,
        'phone': phone ?? '+91 98765 43210',
        'role': email.contains('admin') ? 'admin' : (email.contains('helper') ? 'helper' : 'seeker'),
        'trust_score': 85,
        'wallet_balance': 1000.0,
        'tasks_completed': 0,
        'total_earnings': 0.0,
        'is_suspended': false,
      };
      _mockProfiles.add(newProfile);
      _mockCurrentUser = newProfile;
      
      return AuthResponse(
        session: null,
        user: User(
          id: newId,
          email: email,
          createdAt: DateTime.now().toIso8601String(),
          appMetadata: {},
          userMetadata: {'full_name': fullName},
          aud: '',
        ),
      );
    }
    return await auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName, 'phone': phone},
    );
  }

  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    if (isMockMode) {
      Map<String, dynamic>? profile;
      try {
        profile = _mockProfiles.firstWhere((p) => p['email'] == email);
      } catch (_) {
        final isAd = email.contains('admin');
        final isHe = email.contains('helper');
        final defaultId = isAd ? 'admin-id' : (isHe ? 'helper-id' : 'seeker-id');
        
        profile = _mockProfiles.firstWhere((p) => p['id'] == defaultId);
      }

      _mockCurrentUser = profile;

      return AuthResponse(
        session: null,
        user: User(
          id: profile['id'],
          email: email,
          createdAt: DateTime.now().toIso8601String(),
          appMetadata: {},
          userMetadata: {'full_name': profile['full_name']},
          aud: '',
        ),
      );
    }
    return await auth.signInWithPassword(email: email, password: password);
  }

  static Future<void> signOut() async {
    if (isMockMode) {
      _mockCurrentUser = null;
      return;
    }
    await auth.signOut();
  }

  static Session? get currentSession => isMockMode ? null : auth.currentSession;
  
  static User? get currentUser {
    if (isMockMode) {
      if (_mockCurrentUser == null) return null;
      return User(
        id: _mockCurrentUser!['id'],
        email: _mockCurrentUser!['email'] ?? 'demo@quickaid.com',
        createdAt: DateTime.now().toIso8601String(),
        appMetadata: {},
        userMetadata: {},
        aud: '',
      );
    }
    try {
      return auth.currentUser;
    } catch (_) {
      return null;
    }
  }

  // ── PASSWORD RESET ───────────────────────────────────────
  static Future<void> sendPasswordResetEmail(String email) async {
    if (isMockMode) return;
    await auth.resetPasswordForEmail(email);
  }

  static Future<void> updatePassword(String newPassword) async {
    if (isMockMode) return;
    await auth.updateUser(UserAttributes(password: newPassword));
  }

  // ── PROFILE ──────────────────────────────────────────────
  static Future<Map<String, dynamic>?> getProfile(String userId) async {
    if (isMockMode) {
      try {
        return _mockProfiles.firstWhere((p) => p['id'] == userId);
      } catch (_) {
        return null;
      }
    }
    final res = await client
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();
    return res;
  }

  static Future<void> updateProfile(
    String userId,
    Map<String, dynamic> data,
  ) async {
    if (isMockMode) {
      final idx = _mockProfiles.indexWhere((p) => p['id'] == userId);
      if (idx != -1) {
        _mockProfiles[idx].addAll(data);
      }
      return;
    }
    await client.from('profiles').update(data).eq('id', userId);
  }

  // ── TASKS ────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getOpenTasks() async {
    if (isMockMode) {
      return _mockTasks.where((t) => t['status'] == 'open').toList();
    }
    final res = await client
        .from('tasks')
        .select('*, profiles!seeker_id(full_name, avatar_url, trust_score)')
        .eq('status', 'open')
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getMyTasks(String userId) async {
    if (isMockMode) {
      return _mockTasks.where((t) => t['seeker_id'] == userId).toList();
    }
    final res = await client
        .from('tasks')
        .select('*, profiles!helper_id(full_name)')
        .eq('seeker_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getAcceptedTasks(String userId) async {
    if (isMockMode) {
      return _mockTasks.where((t) => t['helper_id'] == userId).toList();
    }
    final res = await client
        .from('tasks')
        .select('*, profiles!seeker_id(full_name, avatar_url, trust_score)')
        .eq('helper_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<Map<String, dynamic>> createTask(Map<String, dynamic> data) async {
    if (isMockMode) {
      final seekerProfile = _mockProfiles.firstWhere((p) => p['id'] == data['seeker_id'], orElse: () => {});
      final newTask = {
        'id': 'task-${Random().nextInt(100000)}',
        'title': data['title'],
        'description': data['description'] ?? '',
        'category': data['category'] ?? 'other',
        'pay': data['pay'] ?? 0.0,
        'location_name': data['location_name'] ?? 'Campus',
        'seeker_id': data['seeker_id'],
        'helper_id': null,
        'status': 'open',
        'created_at': DateTime.now().toIso8601String(),
        'profiles': {
          'full_name': seekerProfile['full_name'] ?? 'Sarah Seeker',
          'trust_score': seekerProfile['trust_score'] ?? 90,
          'avatar_url': null,
        }
      };
      _mockTasks.add(newTask);
      return newTask;
    }
    final res = await client.from('tasks').insert(data).select().single();
    return res;
  }

  static Future<void> acceptTask(String taskId, String helperId) async {
    if (isMockMode) {
      final idx = _mockTasks.indexWhere((t) => t['id'] == taskId);
      if (idx != -1) {
        _mockTasks[idx]['helper_id'] = helperId;
        _mockTasks[idx]['status'] = 'accepted';
      }
      return;
    }
    await client
        .from('tasks')
        .update({'helper_id': helperId, 'status': 'accepted'})
        .eq('id', taskId);
  }

  static Future<void> updateTaskStatus(String taskId, String status) async {
    if (isMockMode) {
      final idx = _mockTasks.indexWhere((t) => t['id'] == taskId);
      if (idx != -1) {
        _mockTasks[idx]['status'] = status;
        if (status == 'completed') {
          final helperId = _mockTasks[idx]['helper_id'];
          final pay = _mockTasks[idx]['pay'] ?? 0.0;
          final helperIdx = _mockProfiles.indexWhere((p) => p['id'] == helperId);
          if (helperIdx != -1) {
            _mockProfiles[helperIdx]['wallet_balance'] = (_mockProfiles[helperIdx]['wallet_balance'] ?? 0.0) + pay;
            _mockProfiles[helperIdx]['total_earnings'] = (_mockProfiles[helperIdx]['total_earnings'] ?? 0.0) + pay;
            _mockProfiles[helperIdx]['tasks_completed'] = (_mockProfiles[helperIdx]['tasks_completed'] ?? 0) + 1;
          }
        }
      }
      return;
    }
    await client.from('tasks').update({'status': status}).eq('id', taskId);
  }

  // ── TRANSACTIONS ─────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getTransactions(String userId) async {
    if (isMockMode) {
      return [
        {
          'id': 'tx-1',
          'user_id': userId,
          'amount': 150.0,
          'type': 'credit',
          'title': 'Completed exam document delivery',
          'created_at': DateTime.now().subtract(const Duration(hours: 4)).toIso8601String(),
        },
        {
          'id': 'tx-2',
          'user_id': userId,
          'amount': 300.0,
          'type': 'credit',
          'title': 'Completed room fan repair',
          'created_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        }
      ];
    }
    final res = await client
        .from('transactions')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  // ── NOTIFICATIONS ────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getNotifications(String userId) async {
    if (isMockMode) {
      return [
        {
          'id': 'notif-1',
          'user_id': userId,
          'title': 'Welcome to QuickAid!',
          'content': 'Start posting or accepting campus tasks with premium security.',
          'is_read': true,
          'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
        }
      ];
    }
    final res = await client
        .from('notifications')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  // ── REALTIME ─────────────────────────────────────────────
  static dynamic subscribeToTasks(void Function(dynamic) onEvent) {
    if (isMockMode) return null;
    return client
        .channel('public:tasks')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'tasks',
          callback: onEvent,
        )
        .subscribe();
  }

  // ── ADMIN ────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getAllUsers() async {
    if (isMockMode) {
      return _mockProfiles;
    }
    final res = await client
        .from('profiles')
        .select()
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<void> setUserSuspended(String userId, bool isSuspended) async {
    if (isMockMode) {
      final idx = _mockProfiles.indexWhere((p) => p['id'] == userId);
      if (idx != -1) {
        _mockProfiles[idx]['is_suspended'] = isSuspended;
      }
      return;
    }
    await client
        .from('profiles')
        .update({'is_suspended': isSuspended})
        .eq('id', userId);
  }

  static Future<void> setUserRole(String userId, String role) async {
    if (isMockMode) {
      final idx = _mockProfiles.indexWhere((p) => p['id'] == userId);
      if (idx != -1) {
        _mockProfiles[idx]['role'] = role;
      }
      return;
    }
    await client.from('profiles').update({'role': role}).eq('id', userId);
  }
}
