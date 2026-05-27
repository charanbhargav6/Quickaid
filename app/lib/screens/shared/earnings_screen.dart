import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _transactions = [];
  Map<String, dynamic>? _profile;
  double _balance = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final userId = SupabaseService.client.auth.currentUser!.id;
      final profile = await SupabaseService.getProfile(userId);
      
      final transactions = List<Map<String, dynamic>>.from(await SupabaseService.client
          .from('transactions')
          .select()
          .or('sender_id.eq.$userId,receiver_id.eq.$userId')
          .order('created_at', ascending: false));

      if (mounted) {
        setState(() {
          _profile = profile;
          _balance = (profile?['wallet_balance'] ?? 0).toDouble();
          _transactions = transactions;
        });
      }
    } catch (e) {
      debugPrint('Error loading earnings: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = SupabaseService.client.auth.currentUser?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings & Wallet')),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade800,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Balance', style: TextStyle(color: Colors.white70, fontSize: 16)),
                      Text('₹${_balance.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Align(alignment: Alignment.centerLeft, child: Text('Transaction History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
                ),
                Expanded(
                  child: _transactions.isEmpty
                      ? const Center(child: Text('No transactions found.'))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _transactions.length,
                          itemBuilder: (context, index) {
                            final tx = _transactions[index];
                            final isReceived = tx['receiver_id'] == userId;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: isReceived ? Colors.green.shade100 : Colors.red.shade100,
                                  child: Icon(isReceived ? Icons.arrow_downward : Icons.arrow_upward, color: isReceived ? Colors.green : Colors.red),
                                ),
                                title: Text(tx['type']?.toString().toUpperCase() ?? 'TRANSFER'),
                                subtitle: Text(tx['created_at'].toString().split('T').first),
                                trailing: Text(
                                  '${isReceived ? '+' : '-'}₹${tx['amount']}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isReceived ? Colors.green : Colors.red,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
