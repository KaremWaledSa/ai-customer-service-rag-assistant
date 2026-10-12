import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../../data/models/message.dart';
import '../../providers/inbox_provider.dart';

class MessageDetailScreen extends StatefulWidget {
  final int messageId;

  const MessageDetailScreen({super.key, required this.messageId});

  @override
  State<MessageDetailScreen> createState() => _MessageDetailScreenState();
}

class _MessageDetailScreenState extends State<MessageDetailScreen> {
  final _responseController = TextEditingController();
  bool _isEdited = false;
  bool _isSending = false;

  @override
  void dispose() {
    _responseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل الرسالة'),
      ),
      body: Consumer<InboxProvider>(
        builder: (context, inbox, _) {
          final message = inbox.selectedMessage;

          if (message == null) {
            return const Center(child: CircularProgressIndicator());
          }

          // Initialize controller with AI response
          if (_responseController.text.isEmpty && message.aiResponse != null) {
            _responseController.text = message.aiResponse!;
          }

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Client Message Card
                      _SectionCard(
                        title: 'رسالة العميل',
                        icon: Icons.person_outline,
                        color: AppTheme.infoColor,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: AppTheme.infoColor.withOpacity(0.1),
                                  radius: 20,
                                  child: Text(
                                    message.displayName.isNotEmpty
                                        ? message.displayName[0]
                                        : '؟',
                                    style: const TextStyle(
                                      color: AppTheme.infoColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        message.displayName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        message.clientPhone ?? '',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  message.formattedTime,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textMuted,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              message.content,
                              style: const TextStyle(fontSize: 16),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // RAG Examples
                      if (message.ragExamples != null && message.ragExamples!.isNotEmpty) ...[
                        _SectionCard(
                          title: 'محادثات مشابهة (RAG)',
                          icon: Icons.psychology_outlined,
                          color: Colors.purple,
                          child: Column(
                            children: message.ragExamples!.map((example) {
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.purple.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.purple.withOpacity(0.2),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'مثال',
                                          style: TextStyle(
                                            color: Colors.purple[700],
                                            fontWeight: FontWeight.w500,
                                            fontSize: 12,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.purple.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            '${example.similarityPercent}%',
                                            style: TextStyle(
                                              color: Colors.purple[700],
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'العميل: ${example.clientMessage}',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: AppTheme.textSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'الدكتور: ${example.doctorResponse}',
                                      style: const TextStyle(fontSize: 13),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // AI Response / Editor
                      _SectionCard(
                        title: 'رد الذكاء الاصطناعي',
                        icon: Icons.smart_toy_outlined,
                        color: AppTheme.primaryColor,
                        child: Column(
                          children: [
                            if (!message.hasAiResponse)
                              ElevatedButton.icon(
                                onPressed: () {
                                  inbox.generateResponse(message.id);
                                },
                                icon: const Icon(Icons.auto_awesome),
                                label: const Text('توليد رد'),
                              )
                            else
                              TextFormField(
                                controller: _responseController,
                                maxLines: 5,
                                decoration: const InputDecoration(
                                  hintText: 'اكتب الرد هنا...',
                                  border: OutlineInputBorder(),
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _isEdited = value != message.aiResponse;
                                  });
                                },
                              ),

                            if (message.similarityScore != null) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.analytics_outlined,
                                    size: 16,
                                    color: AppTheme.textMuted,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'نسبة التشابه: ${(message.similarityScore! * 100).toStringAsFixed(0)}%',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Info Card
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.infoColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: AppTheme.infoColor,
                              size: 20,
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'عند الموافقة، سيُضاف الرد لقاعدة المعرفة ويتعلم منه النظام',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.infoColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Action Buttons
              if (message.hasAiResponse)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Reject Button
                      OutlinedButton(
                        onPressed: _isSending ? null : () async {
                          setState(() => _isSending = true);
                          final success = await inbox.rejectMessage(message.id);
                          if (context.mounted) {
                            if (success) {
                              Navigator.pop(context);
                            } else {
                              setState(() => _isSending = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(inbox.error ?? 'فشل الرفض'),
                                  backgroundColor: AppTheme.errorColor,
                                ),
                              );
                            }
                          }
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.errorColor,
                          side: const BorderSide(color: AppTheme.errorColor),
                        ),
                        child: _isSending
                            ? const SizedBox(
                                width: 20, height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.close),
                      ),

                      const SizedBox(width: 12),

                      // Edit & Send Button (if edited)
                      if (_isEdited)
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isSending ? null : () async {
                              setState(() => _isSending = true);
                              final success = await inbox.editAndSend(
                                message.id,
                                _responseController.text,
                              );
                              if (context.mounted) {
                                if (success) {
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('تم إرسال الرد المعدّل'),
                                      backgroundColor: AppTheme.successColor,
                                    ),
                                  );
                                } else {
                                  setState(() => _isSending = false);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(inbox.error ?? 'فشل إرسال الرد'),
                                      backgroundColor: AppTheme.errorColor,
                                    ),
                                  );
                                }
                              }
                            },
                            icon: _isSending
                                ? const SizedBox(
                                    width: 20, height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.edit),
                            label: Text(_isSending ? 'جاري الإرسال...' : 'إرسال المعدّل'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.warningColor,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),

                      if (!_isEdited)
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isSending ? null : () async {
                              setState(() => _isSending = true);
                              final success = await inbox.approveMessage(message.id);
                              if (context.mounted) {
                                if (success) {
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('تم الموافقة والإرسال'),
                                      backgroundColor: AppTheme.successColor,
                                    ),
                                  );
                                } else {
                                  setState(() => _isSending = false);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(inbox.error ?? 'فشل الموافقة والإرسال'),
                                      backgroundColor: AppTheme.errorColor,
                                    ),
                                  );
                                }
                              }
                            },
                            icon: _isSending
                                ? const SizedBox(
                                    width: 20, height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.check),
                            label: Text(_isSending ? 'جاري الإرسال...' : 'موافقة وإرسال'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
