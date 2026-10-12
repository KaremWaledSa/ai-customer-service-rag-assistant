import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../auth/providers/auth_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الإعدادات'),
      ),
      body: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // User Info Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                        child: Text(
                          auth.userName.isNotEmpty ? auth.userName[0] : 'د',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        auth.userName,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        auth.user?['email'] ?? '',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Stats Section
              const Text(
                'الإحصائيات',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              Card(
                child: Column(
                  children: [
                    _SettingsTile(
                      icon: Icons.analytics_outlined,
                      title: 'استخدام API',
                      subtitle: 'مراقبة التكلفة والاستهلاك',
                      onTap: () {
                        // TODO: Navigate to API usage screen
                      },
                    ),
                    const Divider(height: 1),
                    _SettingsTile(
                      icon: Icons.bar_chart_outlined,
                      title: 'إحصائيات الرسائل',
                      subtitle: 'عدد الرسائل والردود',
                      onTap: () {
                        // TODO: Navigate to message stats screen
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Settings Section
              const Text(
                'الإعدادات',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              Card(
                child: Column(
                  children: [
                    _SettingsTile(
                      icon: Icons.language_outlined,
                      title: 'اللغة',
                      subtitle: 'العربية',
                      onTap: () {
                        // TODO: Language settings
                      },
                    ),
                    const Divider(height: 1),
                    _SettingsTile(
                      icon: Icons.notifications_outlined,
                      title: 'الإشعارات',
                      subtitle: 'إدارة التنبيهات',
                      onTap: () {
                        // TODO: Notification settings
                      },
                    ),
                    const Divider(height: 1),
                    _SettingsTile(
                      icon: Icons.cloud_outlined,
                      title: 'الخادم',
                      subtitle: 'localhost:3001',
                      onTap: () {
                        // TODO: Server settings
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // About Section
              const Text(
                'حول التطبيق',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              Card(
                child: Column(
                  children: [
                    _SettingsTile(
                      icon: Icons.info_outline,
                      title: 'الإصدار',
                      subtitle: '1.0.0',
                      onTap: null,
                    ),
                    const Divider(height: 1),
                    _SettingsTile(
                      icon: Icons.description_outlined,
                      title: 'الوثائق',
                      subtitle: 'دليل الاستخدام',
                      onTap: () {
                        // TODO: Open docs
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Logout Button
              ElevatedButton.icon(
                onPressed: () => _confirmLogout(context, auth),
                icon: const Icon(Icons.logout),
                label: const Text('تسجيل الخروج'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.errorColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),

              const SizedBox(height: 24),

              // Footer
              Text(
                'مساعد التغذية الذكي - RAG\nمبني بـ Flutter & Node.js',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textMuted,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تسجيل الخروج'),
        content: const Text('هل أنت متأكد من تسجيل الخروج؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              auth.logout();
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('خروج'),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primaryColor),
      title: Text(title),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: AppTheme.textMuted,
        ),
      ),
      trailing: onTap != null
          ? const Icon(Icons.chevron_left, color: AppTheme.textMuted)
          : null,
      onTap: onTap,
    );
  }
}
