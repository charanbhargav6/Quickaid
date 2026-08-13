import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/gradient_button.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Support & FAQ'),
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
            Text('Frequently Asked Questions', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            
            _buildFaqItem(
              theme, 
              'How do I pay a Helper?', 
              'Currently, all payments are handled directly between the Seeker and the Helper. Once the task is completed, you can pay using UPI, cash, or any mutually agreed method.'
            ),
            _buildFaqItem(
              theme, 
              'How does the Trust Score work?', 
              'Your Trust Score is calculated based on your task completion rate and the reviews you receive from other users. Maintaining a high score ensures you get picked for more tasks!'
            ),
            _buildFaqItem(
              theme, 
              'What if I feel unsafe?', 
              'Safety is our top priority. You can use the SOS button inside the chat screen to immediately alert local authorities. You can also report and block any user who violates our guidelines.'
            ),
            _buildFaqItem(
              theme, 
              'Can I cancel a task?', 
              'Yes, but frequent cancellations will negatively impact your Trust Score. Please only accept or post tasks you intend to follow through with.'
            ),
            
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 32),
            
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.colorScheme.onSurface.withValues(alpha: 0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.support_agent, size: 48, color: Colors.blue),
                  const SizedBox(height: 16),
                  Text(
                    'Still need help?',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Our support team is here for you.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
                  ),
                  const SizedBox(height: 24),
                  GradientButton(
                    label: 'Email Support',
                    onPressed: () async {
                      final Uri emailLaunchUri = Uri(
                        scheme: 'mailto',
                        path: 'support@quickaid.com',
                        query: 'subject=QuickAid App Support Request',
                      );
                      if (await canLaunchUrl(emailLaunchUri)) {
                        await launchUrl(emailLaunchUri);
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqItem(ThemeData theme, String question, String answer) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(question, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.blue)),
          const SizedBox(height: 8),
          Text(answer, style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.8), height: 1.5)),
        ],
      ),
    );
  }
}
