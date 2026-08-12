import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:ui';
import '../../services/supabase_service.dart';

class HelperProfileScreen extends StatefulWidget {
  final String helperId;
  
  const HelperProfileScreen({super.key, required this.helperId});

  @override
  State<HelperProfileScreen> createState() => _HelperProfileScreenState();
}

class _HelperProfileScreenState extends State<HelperProfileScreen> {
  bool _loading = true;
  bool _uploading = false;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _reviews = [];
  bool _isOwner = false;

  @override
  void initState() {
    super.initState();
    _checkOwner();
    _loadProfile();
  }
  
  void _checkOwner() {
    final user = Supabase.instance.client.auth.currentUser;
    if (user != null && user.id == widget.helperId) {
      _isOwner = true;
    }
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      _profile = await SupabaseService.getProfile(widget.helperId);
      _reviews = await SupabaseService.getReviews(widget.helperId);
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
  
  Future<void> _uploadAvatar() async {
    if (!_isOwner) return;
    
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    
    if (image == null) return;
    
    setState(() => _uploading = true);
    try {
      final bytes = await image.readAsBytes();
      final fileExt = image.name.split('.').last;
      final fileName = '${widget.helperId}-${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      
      final storage = Supabase.instance.client.storage.from('avatars');
      await storage.uploadBinary(fileName, bytes, fileOptions: const FileOptions(upsert: true));
      final publicUrl = storage.getPublicUrl(fileName);
      
      await Supabase.instance.client.from('profiles').update({'avatar_url': publicUrl}).eq('id', widget.helperId);
      await _loadProfile();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile picture updated successfully!')));
      }
    } catch (e) {
      debugPrint('Upload error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    if (_loading) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const Center(child: Text('Profile not found.')),
      );
    }

    final trustScore = _profile!['trust_score'] ?? 50;
    final totalReviews = _reviews.length;
    final completedTasks = _profile!['tasks_completed'] ?? 0;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text(''),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: isDark ? Colors.white : Colors.black87),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Section
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark 
                    ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                    : [const Color(0xFF3B82F6), const Color(0xFF2563EB)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(32), bottomRight: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 15, offset: const Offset(0, 5))
                ]
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
                  child: Column(
                    children: [
                      GestureDetector(
                        onTap: _uploadAvatar,
                        child: Stack(
                          children: [
                            Container(
                              width: 110,
                              height: 110,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white,
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, spreadRadius: 2)
                                ],
                                image: _profile!['avatar_url'] != null ? DecorationImage(
                                  image: NetworkImage(_profile!['avatar_url']),
                                  fit: BoxFit.cover,
                                ) : null,
                              ),
                              child: _profile!['avatar_url'] == null ? Center(
                                child: Text(
                                  _profile!['full_name'] != null && _profile!['full_name'].isNotEmpty ? _profile!['full_name'][0] : 'U',
                                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                                ),
                              ) : null,
                            ),
                            if (_isOwner)
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                  ),
                                  child: _uploading 
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _profile!['full_name'] ?? 'Unknown', 
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildPillBadge('Verified', Colors.greenAccent, Icons.check_circle, isDark),
                          const SizedBox(width: 8),
                          _buildPillBadge((_profile!['role'] ?? '').toUpperCase(), Colors.blueAccent, Icons.person, isDark),
                          if (trustScore >= 30 && trustScore < 50) ...[
                            const SizedBox(width: 8),
                            _buildPillBadge('Warning', Colors.orangeAccent, Icons.warning, isDark),
                          ],
                          if (_profile!['is_suspended'] == true) ...[
                            const SizedBox(width: 8),
                            _buildPillBadge('Suspended', Colors.redAccent, Icons.block, isDark),
                          ]
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            // Stats Section
            Transform.translate(
              offset: const Offset(0, -25),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(child: _buildMetricCard('Trust Score', '$trustScore/100', trustScore >= 80 ? Colors.green : trustScore >= 50 ? Colors.orange : Colors.red, Icons.health_and_safety, isDark)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildMetricCard('Reviews', totalReviews.toString(), isDark ? Colors.white : Colors.black87, Icons.star, isDark)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildMetricCard('Completed', completedTasks.toString(), isDark ? Colors.white : Colors.black87, Icons.task_alt, isDark)),
                  ],
                ),
              ),
            ),
            
            // Reviews Section
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 10, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Recent Reviews', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  if (_reviews.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.star_outline, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text('No reviews yet.', style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 16, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    )
                  else
                    ..._reviews.map((r) => _buildReviewCard(r, isDark)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildPillBadge(String label, Color color, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, Color valueColor, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[100]!),
      ),
      child: Column(
        children: [
          Icon(icon, color: isDark ? Colors.grey[400] : Colors.grey[500], size: 20),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: valueColor)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600], fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        ],
      ),
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review, bool isDark) {
    final rating = review['rating'] ?? 5;
    final reviewer = review['reviewer'] ?? {};
    final avatarUrl = reviewer['avatar_url'];
    final name = reviewer['full_name'] ?? 'Anonymous';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4))],
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.1),
                  shape: BoxShape.circle,
                  image: avatarUrl != null ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover) : null,
                ),
                child: avatarUrl == null ? Center(child: Text(name[0], style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB)))) : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: isDark ? Colors.white : Colors.black87)),
                    Text(
                      DateTime.parse(review['created_at']).toLocal().toString().split(' ')[0],
                      style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[500], fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              Row(
                children: List.generate(5, (index) => Icon(
                  index < rating ? Icons.star : Icons.star_border,
                  color: index < rating ? const Color(0xFFFBBF24) : Colors.grey[300],
                  size: 18,
                )),
              ),
            ],
          ),
          if (review['comment'] != null && review['comment'].isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(review['comment'], style: TextStyle(color: isDark ? Colors.grey[300] : const Color(0xFF334155), height: 1.5, fontSize: 14)),
            ),
          ],
        ],
      ),
    );
  }
}
