import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;
  static GoTrueClient get auth => client.auth;

  // ── AUTH ────────────────────────────────────────────────
  static Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
    String role = 'seeker',
  }) async {
    final res = await client.auth.signUp(email: email, password: password);
    if (res.user != null) {
      await client.from('profiles').insert({
        'id': res.user!.id,
        'email': email,
        'full_name': fullName,
        'phone': phone,
        'role': role,
      });
    }
  }

  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await auth.signInWithPassword(email: email, password: password);
  }

  static Future<void> signOut() async {
    await auth.signOut();
  }

  static Session? get currentSession => auth.currentSession;
  
  static User? get currentUser {
    try {
      return auth.currentUser;
    } catch (_) {
      return null;
    }
  }

  // ── PASSWORD RESET ───────────────────────────────────────
  static Future<void> sendPasswordResetEmail(String email) async {
    await auth.resetPasswordForEmail(email);
  }

  static Future<void> updatePassword(String newPassword) async {
    await auth.updateUser(UserAttributes(password: newPassword));
  }

  // ── PROFILE ──────────────────────────────────────────────
  static Future<Map<String, dynamic>?> getProfile(String userId) async {
    final res = await client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    return res;
  }

  static Future<void> updateProfile(
    String userId,
    Map<String, dynamic> data,
  ) async {
    await client.from('profiles').update(data).eq('id', userId);
  }

  // ── TASKS ────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getOpenTasks() async {
    final res = await client
        .from('tasks')
        .select('*, profiles!seeker_id(full_name, trust_score)')
        .eq('status', 'open')
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getMyTasks(String userId) async {
    final res = await client
        .from('tasks')
        .select('*, profiles!helper_id(full_name)')
        .eq('seeker_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getAcceptedTasks(String userId) async {
    final res = await client
        .from('tasks')
        .select('*, profiles!seeker_id(full_name, trust_score)')
        .eq('helper_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<Map<String, dynamic>> createTask(Map<String, dynamic> data) async {
    final res = await client.from('tasks').insert(data).select().single();
    return res;
  }

  static Future<void> acceptTask(String taskId, String helperId) async {
    await client
        .from('tasks')
        .update({'status': 'accepted', 'helper_id': helperId})
        .eq('id', taskId);
  }

  static Future<void> completeTask(String taskId, String status) async {
    // If completing the task successfully, we call the secure RPC to transfer funds and update status.
    // Otherwise (e.g. cancelled), we just update the status.
    if (status == 'completed') {
      await client.rpc('transfer_funds', params: {'p_task_id': taskId});
    } else {
      await client.from('tasks').update({'status': status}).eq('id', taskId);
    }
  }

  // ── WALLET (Demo Purposes) ───────────────────────────────
  static Future<void> addDemoFunds(double amount) async {
    await client.rpc('add_demo_funds', params: {'p_amount': amount});
  }

  static Future<void> deleteTask(String taskId) async {
    await client.from('tasks').delete().eq('id', taskId);
  }

  // ── TRANSACTIONS ─────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getTransactions(String userId) async {
    final res = await client
        .from('transactions')
        .select('*, tasks(title)')
        .eq('user_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  // ── ADMIN ────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getAllProfiles() async {
    final res = await client
        .from('profiles')
        .select()
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<void> setSuspendStatus(String userId, bool isSuspended) async {
    await client
        .from('profiles')
        .update({'is_suspended': isSuspended})
        .eq('id', userId);
  }

  static Future<void> changeRole(String userId, String role) async {
    await client
        .from('profiles')
        .update({'role': role})
        .eq('id', userId);
  }

  // ── REVIEWS & RATINGS ──────────────────────────────────────
  static Future<void> submitReview({
    required String taskId,
    required String revieweeId,
    required int rating,
    String? comment,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Not authenticated');

    await client.from('reviews').insert({
      'task_id': taskId,
      'reviewer_id': user.id,
      'reviewee_id': revieweeId,
      'rating': rating,
      'comment': comment,
    });
  }

  static Future<List<Map<String, dynamic>>> getReviews(String userId) async {
    final res = await client
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(full_name)')
        .eq('reviewee_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }
}
