import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../shared/app_drawer.dart';
import '../../widgets/skeleton_loader.dart';

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

  void _showWithdrawDialog() {
    double amount = 0;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          title: const Text('Withdraw via UPI'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Available Balance: ₹${_balance.toStringAsFixed(2)}'),
              const SizedBox(height: 16),
              const TextField(
                decoration: InputDecoration(
                  labelText: 'UPI ID',
                  hintText: 'example@upi',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(label: const Text('₹100'), onPressed: () => setStateDialog(() => amount = 100)),
                  ActionChip(label: const Text('₹500'), onPressed: () => setStateDialog(() => amount = 500)),
                  ActionChip(label: const Text('All'), onPressed: () => setStateDialog(() => amount = _balance)),
                ],
              ),
              const SizedBox(height: 16),
              Text('Selected: ₹${amount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: amount > 0 && amount <= _balance ? () async {
                try {
                  await SupabaseService.withdrawFunds(amount);
                  if (context.mounted) Navigator.pop(ctx);
                  _loadData();
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Withdrawal Successful!')));
                } catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              } : null,
              child: const Text('Withdraw'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userId = SupabaseService.client.auth.currentUser?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings & Wallet')),
      drawer: _profile != null ? AppDrawer(user: _profile!) : null,
      body: _loading
          ? const SkeletonListView()
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade800,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Balance', style: TextStyle(color: Colors.white70, fontSize: 16)),
                          Text('₹${_balance.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.green.shade800),
                          onPressed: _balance > 0 ? _showWithdrawDialog : null,
                          child: const Text('Withdraw to UPI'),
                        ),
                      ),
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
                            final type = tx['type']?.toString().toUpperCase() ?? 'TRANSFER';
                            
                            IconData iconData = Icons.swap_horiz;
                            Color iconColor = Colors.grey;
                            
                            if (type == 'WITHDRAWAL') {
                              iconData = Icons.account_balance;
                              iconColor = Colors.blue;
                            } else if (type == 'ESCROW') {
                              iconData = Icons.lock;
                              iconColor = Colors.orange;
                            } else if (isReceived) {
                              iconData = Icons.arrow_downward;
                              iconColor = Colors.green;
                            } else {
                              iconData = Icons.arrow_upward;
                              iconColor = Colors.red;
                            }

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: iconColor.withValues(alpha: 0.1),
                                  child: Icon(iconData, color: iconColor),
                                ),
                                title: Text(type),
                                subtitle: Text(tx['created_at'].toString().split('T').first),
                                trailing: Text(
                                  '${type == 'WITHDRAWAL' ? '-' : isReceived ? '+' : '-'}₹${tx['amount']}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: type == 'WITHDRAWAL' ? Colors.blue : (isReceived ? Colors.green : Colors.red),
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
