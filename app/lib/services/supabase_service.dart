import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'notification_service.dart';

class NewDeviceException implements Exception {}

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
    final res = await client.auth.signUp(
      email: email,
      password: password,
      data: {
        'full_name': fullName,
        'phone': phone,
        'role': role,
      },
    );
    
    // Check for Email Enumeration Protection masking existing email
    if (res.user != null && res.user!.identities != null && res.user!.identities!.isEmpty) {
      throw const AuthException('This email address is already registered. Please sign in.');
    }
  }

  static Future<String> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');
    if (deviceId == null) {
      deviceId = DateTime.now().millisecondsSinceEpoch.toString() + '_' + (1000 + DateTime.now().microsecond).toString();
      await prefs.setString('device_id', deviceId);
    }
    return deviceId;
  }

  static Future<void> signInWithGoogle() async {
    await auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.supabase.quickaid://login-callback/',
    );
  }

  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final res = await auth.signInWithPassword(email: email, password: password);
    
    // Check device logic and sync profile
    if (res.user != null) {
      final deviceId = await getDeviceId();
      final deviceCheck = await client.from('user_devices')
          .select()
          .eq('user_id', res.user!.id)
          .eq('device_id', deviceId)
          .maybeSingle();

      if (deviceCheck == null) {
        // TEMPORARY BYPASS: Register the device automatically instead of forcing OTP
        await client.from('user_devices').insert({
          'user_id': res.user!.id,
          'device_id': deviceId,
          'device_name': 'Test Device',
        });
        
        await NotificationService.syncTokenToSupabase();
        await client.rpc('log_device_login', params: {'p_device_id': deviceId});
        
        // Unrecognized device -> force OTP (Commented out due to SMTP errors)
        // await auth.signOut();
        // await auth.signInWithOtp(email: email);
        // throw NewDeviceException();
      } else {
        // Recognized device -> update last login
        await NotificationService.syncTokenToSupabase();
        await client.rpc('log_device_login', params: {'p_device_id': deviceId});
        
        // Fetch current profile to prevent overwriting admins
        final profile = await getProfile(res.user!.id);
        if (profile != null && profile['role'] != 'admin' && res.user!.userMetadata != null) {
          final meta = res.user!.userMetadata!;
          final needsSync = 
            (meta['role'] != null && meta['role'] != profile['role']) ||
            (meta['full_name'] != null && meta['full_name'] != profile['full_name']) ||
            (meta['phone'] != null && meta['phone'] != profile['phone']);
            
          if (needsSync) {
            await client.from('profiles').update({
              'full_name': meta['full_name'] ?? profile['full_name'],
              'phone': meta['phone'] ?? profile['phone'],
              'role': meta['role'] ?? profile['role'],
            }).eq('id', res.user!.id);
          }
        }
        
        // Save verification timestamp for 30-day relogin check
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('last_verified_at', DateTime.now().millisecondsSinceEpoch);
      }
    }
    
    return res;
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
  static Future<List<Map<String, dynamic>>> getOpenTasks(String userId) async {
    final res = await client
        .from('tasks')
        .select('*, profiles!seeker_id(full_name, trust_score)')
        .eq('status', 'open')
        .neq('seeker_id', userId)
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
    final user = client.auth.currentUser;
    if (user != null) {
      final profile = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile != null && profile['role'] == 'admin') {
        throw Exception('Admins are not allowed to post tasks.');
      }
    }
    
    if (data['pay'] != null && (data['pay'] as num) < 50) {
      throw Exception('Minimum task price is ₹50');
    }

    final res = await client.from('tasks').insert(data).select().single();
    return res;
  }

  static Future<void> acceptTask(String taskId, String helperId) async {
    // Check if the user is the seeker or admin
    final profile = await client.from('profiles').select('role').eq('id', helperId).maybeSingle();
    if (profile != null && profile['role'] == 'admin') {
      throw Exception('Admins are not allowed to accept tasks.');
    }

    final task = await client.from('tasks').select('seeker_id').eq('id', taskId).maybeSingle();
    if (task != null && task['seeker_id'] == helperId) {
      throw Exception('You cannot accept your own task.');
    }

    await client
        .from('tasks')
        .update({'status': 'accepted', 'helper_id': helperId})
        .eq('id', taskId);
  }

  static Future<void> completeTask(String taskId, String status) async {
    if (status == 'completed') {
      await client.rpc('complete_task_with_trust', params: {'p_task_id': taskId});
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

  // ── COUNTER OFFERS ─────────────────────────────────────────
  static Future<void> submitOffer(String taskId, double proposedPay) async {
    final user = currentUser;
    if (user == null) throw Exception('Not authenticated');

    await client.from('task_offers').upsert({
      'task_id': taskId,
      'helper_id': user.id,
      'proposed_pay': proposedPay,
      'status': 'pending',
    }, onConflict: 'task_id, helper_id');
  }

  static Future<List<Map<String, dynamic>>> getIncomingOffers() async {
    final user = currentUser;
    if (user == null) return [];

    final response = await client
        .from('task_offers')
        .select('*, tasks!inner(*), profiles:helper_id(full_name, trust_score, fcm_token)')
        .eq('status', 'pending')
        .eq('tasks.seeker_id', user.id);
        
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<void> acceptOffer(String offerId, String taskId, String helperId, double proposedPay, double currentPay, String helperFcmToken) async {
    final user = currentUser;
    if (user == null) throw Exception('Not authenticated');

    // 1. Adjust wallet if proposed pay > current pay
    final priceDiff = proposedPay - currentPay;
    if (priceDiff > 0) {
      final profile = await client.from('profiles').select('wallet_balance').eq('id', user.id).single();
      final balance = (profile['wallet_balance'] as num).toDouble();
      if (balance < priceDiff) {
        throw Exception('Insufficient funds to accept this offer.');
      }
      await client.from('profiles').update({'wallet_balance': balance - priceDiff}).eq('id', user.id);
      
      await client.from('transactions').insert({
        'task_id': taskId,
        'user_id': user.id,
        'amount': priceDiff,
        'type': 'escrow',
        'status': 'completed'
      });
    } else if (priceDiff < 0) {
      final refund = priceDiff.abs();
      final profile = await client.from('profiles').select('wallet_balance').eq('id', user.id).single();
      final balance = (profile['wallet_balance'] as num).toDouble();
      await client.from('profiles').update({'wallet_balance': balance + refund}).eq('id', user.id);
    }

    // 2. Update Task
    await client.from('tasks').update({
      'status': 'accepted',
      'helper_id': helperId,
      'pay': proposedPay,
      'accepted_at': DateTime.now().toIso8601String()
    }).eq('id', taskId);

    // 3. Update Offers
    await client.from('task_offers').update({'status': 'accepted'}).eq('id', offerId);
    await client.from('task_offers').update({'status': 'rejected'}).eq('task_id', taskId).eq('status', 'pending');

    // 4. Notify Helper
    await client.from('notifications').insert({
      'user_id': helperId,
      'title': 'Offer Accepted! 🎉',
      'body': 'Your counter-offer of ₹$proposedPay was accepted!',
      'data': {'type': 'offer_accepted', 'taskId': taskId}
    });

    // TODO: Send FCM Push Notification via Edge Function or Node backend.
  }

  static Future<List<Map<String, dynamic>>> getReviews(String userId) async {
    final res = await client
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(full_name)')
        .eq('reviewee_id', userId)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }

  // ── TRUST & SAFETY & AVAILABILITY ──────────────────────
  static Future<List<Map<String, dynamic>>> getActiveHelpers() async {
    final res = await client
        .from('profiles')
        .select('*')
        .eq('is_available', true)
        .gte('available_until', DateTime.now().toUtc().toIso8601String());
    return List<Map<String, dynamic>>.from(res);
  }

  // ── GEOLOCATION ─────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getNearbyTasks(
    double lat, 
    double lng, 
    double radiusKm, {
    String? searchQuery,
    String? category,
    double? minPay,
  }) async {
    final user = currentUser;
    if (user == null) return [];

    final params = {
      'p_lat': lat,
      'p_lng': lng,
      'p_radius_km': radiusKm,
      'p_helper_id': user.id,
    };
    
    if (searchQuery != null && searchQuery.isNotEmpty) params['p_search_query'] = searchQuery;
    if (category != null && category.isNotEmpty) params['p_category'] = category;
    if (minPay != null) params['p_min_pay'] = minPay;

    final response = await client.rpc('get_nearby_tasks', params: params);
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<List<Map<String, dynamic>>> getNearbyHelpers(double lat, double lng, double radiusKm) async {
    final res = await client.rpc('get_nearby_helpers', params: {
      'p_lat': lat,
      'p_lng': lng,
      'p_radius_km': radiusKm
    });
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<void> toggleAvailability(int hours, {double? lat, double? lng}) async {
    await client.rpc('toggle_availability', params: {
      'p_duration_hours': hours,
      'p_lat': lat,
      'p_lng': lng,
    });
  }

  static Future<void> cancelTaskWithPenalty(String taskId) async {
    await client.rpc('cancel_task_with_penalty', params: {'p_task_id': taskId});
  }

  static Future<void> submitUserReport(String reportedId, String taskId, String reason, String details) async {
    await client.rpc('submit_user_report', params: {
      'p_reported_id': reportedId,
      'p_task_id': taskId,
      'p_reason': reason,
      'p_details': details,
    });
  }

  static Future<void> triggerSOS(String taskId, String location) async {
    final user = currentUser;
    if (user == null) return;
    await client.from('user_reports').insert({
      'reporter_id': user.id,
      'reported_user_id': user.id, // self-reported for emergency tracking
      'task_id': taskId,
      'reason': 'EMERGENCY SOS',
      'details': 'SOS triggered at: $location',
    });
  }

  static Future<void> disputeTask(String taskId, String reason) async {
    await client.rpc('dispute_task', params: {
      'p_task_id': taskId,
      'p_reason': reason,
    });
  }

  static Future<void> updateLocation(double lat, double lng) async {
    final user = currentUser;
    if (user == null) return;
    await client.from('profiles').update({
      'current_lat': lat,
      'current_lng': lng,
    }).eq('id', user.id);
  }
}
