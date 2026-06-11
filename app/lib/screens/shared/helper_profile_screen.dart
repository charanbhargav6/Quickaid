import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';

class HelperProfileScreen extends StatefulWidget {
  final String helperId;
  
  const HelperProfileScreen({super.key, required this.helperId});

  @override
  State<HelperProfileScreen> createState() => _HelperProfileScreenState();
}

class _HelperProfileScreenState extends State<HelperProfileScreen> {
  bool _loading = true;
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _reviews = [];

  @override
  void initState() {
    super.initState();
    _loadProfile();
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: const Center(child: Text('Profile not found.')),
      );
    }

    final trustScore = _profile!['trust_score'] ?? 50;

    return Scaffold(
      appBar: AppBar(title: Text(_profile!['full_name'] ?? 'Helper Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.1),
              child: Text(
                _profile!['full_name'] != null ? _profile!['full_name'][0] : 'H',
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
              ),
            ),
            const SizedBox(height: 16),
            Text(_profile!['full_name'] ?? 'Unknown', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: const Text('Verified', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                if (trustScore >= 30 && trustScore <= 50) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                    child: const Row(
                      children: [
                        Icon(Icons.warning, color: Colors.orange, size: 12),
                        SizedBox(width: 4),
                        Text('Warning', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStatItem('Trust Score', '$trustScore/100', trustScore >= 80 ? Colors.green : trustScore >= 50 ? Colors.orange : Colors.red),
                  Container(width: 1, height: 40, color: const Color(0xFFE2E8F0)),
                  _buildStatItem('Reviews', _reviews.length.toString(), const Color(0xFF1E293B)),
                  Container(width: 1, height: 40, color: const Color(0xFFE2E8F0)),
                  _buildStatItem('Completed', (_profile!['tasks_completed'] ?? 0).toString(), const Color(0xFF1E293B)),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Recent Reviews', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            if (_reviews.isEmpty)
              const Text('No reviews yet.', style: TextStyle(color: Colors.grey))
            else
              ..._reviews.map((r) => _buildReviewCard(r)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: valueColor)),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(review['reviewer']?['full_name'] ?? 'Anonymous', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  DateTime.parse(review['created_at']).toLocal().toString().split(' ')[0],
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (index) {
                return Icon(
                  index < review['rating'] ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                  size: 16,
                );
              }),
            ),
            if (review['comment'] != null && review['comment'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(review['comment'], style: const TextStyle(color: Color(0xFF475569))),
            ],
          ],
        ),
      ),
    );
  }
}
