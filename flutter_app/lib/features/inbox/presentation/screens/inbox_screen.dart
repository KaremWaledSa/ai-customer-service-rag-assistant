import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../../data/models/message.dart';
import '../../providers/inbox_provider.dart';
import 'message_detail_screen.dart';

class InboxScreen extends StatelessWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الرسائل الواردة'),
        actions: [
          Consumer<InboxProvider>(
            builder: (context, inbox, _) {
              return IconButton(
                icon: inbox.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.refresh),
                onPressed: inbox.isLoading
                    ? null
                    : () => inbox.fetchPendingMessages(),
              );
            },
          ),
        ],
      ),
      body: Consumer<InboxProvider>(
        builder: (context, inbox, _) {
          if (inbox.isLoading && inbox.pendingMessages.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (inbox.pendingMessages.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_outline,
                      size: 64,
                      color: AppTheme.successColor,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'لا توجد رسائل معلّقة',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'ستظهر الرسائل الجديدة هنا',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => inbox.fetchPendingMessages(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: inbox.pendingMessages.length,
              itemBuilder: (context, index) {
                final message = inbox.pendingMessages[index];
                return _MessageCard(
                  message: message,
                  onTap: () {
                    inbox.selectMessage(message.id);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => MessageDetailScreen(messageId: message.id),
                      ),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _MessageCard extends StatelessWidget {
  final Message message;
  final VoidCallback onTap;

  const _MessageCard({
    required this.message,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  // Avatar
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    child: Text(
                      message.displayName.isNotEmpty
                          ? message.displayName[0]
                          : '؟',
                      style: const TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Name & Time
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          message.displayName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          message.formattedTime,
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Status Badge
                  _StatusBadge(status: message.status),
                ],
              ),

              const SizedBox(height: 12),

              // Message Content
              Text(
                message.content,
                style: const TextStyle(fontSize: 15),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              // Image indicator
              if (message.hasImages) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.infoColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.image,
                        size: 14,
                        color: AppTheme.infoColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${message.imageCount} صورة',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.infoColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // AI Response preview
              if (message.hasAiResponse) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.primaryColor.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.smart_toy_outlined,
                        size: 16,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          message.aiResponse!,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    IconData icon;

    switch (status) {
      case 'ready':
        color = AppTheme.successColor;
        label = 'جاهز';
        icon = Icons.check_circle_outline;
        break;
      case 'pending':
        color = AppTheme.warningColor;
        label = 'معلّق';
        icon = Icons.hourglass_empty;
        break;
      case 'processing':
        color = AppTheme.infoColor;
        label = 'يعالج';
        icon = Icons.sync;
        break;
      default:
        color = AppTheme.textMuted;
        label = status;
        icon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
