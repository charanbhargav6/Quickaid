import 'package:flutter/material.dart';

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Legal & Privacy'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
        titleTextStyle: TextStyle(color: theme.colorScheme.onSurface, fontSize: 20, fontWeight: FontWeight.bold),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Terms and Conditions', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text(
              '1. Introduction\nWelcome to QuickAid (LocalHelper). By using our platform, you agree to be bound by these Terms. QuickAid connects nearby individuals for short-duration physical assistance.\n\n'
              '2. User Roles\nUsers can act as Task Seekers or Helpers. QuickAid is not an employer; Helpers act as independent contractors.\n\n'
              '3. Permitted Tasks\nThe platform is intended for physical nearby assistance (carrying luggage, grocery help, etc.). Prohibited tasks include harassment, illegal deliveries, cheating, and unsafe requests.\n\n'
              '4. Payments and Liability\nPayments are handled externally directly between the Seeker and Helper. QuickAid is not responsible for payment disputes or damages incurred during a task.\n\n'
              '5. Trust and Safety\nWe utilize a Trust Score system. QuickAid reserves the right to suspend users who violate guidelines or receive negative reviews.',
              style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.8), height: 1.5),
            ),
            
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 32),
            
            Text('Privacy Policy', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text(
              '1. Information We Collect\nWe collect your name, email, phone number, and location data when you use the app to find tasks.\n\n'
              '2. How We Use Your Information\nYour information is used to facilitate connections and compute distances. Your precise location is only shared when a task is accepted.\n\n'
              '3. Information Sharing\nWe do not sell personal data. Your contact info is only unlocked and shared after mutual task acceptance.\n\n'
              '4. Data Security\nWe implement standard security measures to protect your data. Chat messages are securely stored for dispute resolution.',
              style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.8), height: 1.5),
            ),
            
            const SizedBox(height: 48),
            Center(
              child: Text(
                'Last updated: June 2026',
                style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.5), fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
