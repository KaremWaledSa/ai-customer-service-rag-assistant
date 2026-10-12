import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../../data/models/knowledge_entry.dart';
import '../../providers/knowledge_provider.dart';

class KnowledgeScreen extends StatefulWidget {
  const KnowledgeScreen({super.key});

  @override
  State<KnowledgeScreen> createState() => _KnowledgeScreenState();
}

class _KnowledgeScreenState extends State<KnowledgeScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KnowledgeProvider>().fetchEntries(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('قاعدة المعرفة'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddDialog(context),
          ),
        ],
      ),
      body: Consumer<KnowledgeProvider>(
        builder: (context, provider, _) {
          return Column(
            children: [
              // Stats Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                color: Colors.white,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatChip(
                      label: 'أساسي',
                      count: provider.initialCount,
                      color: AppTheme.textMuted,
                    ),
                    _StatChip(
                      label: 'مرفوع',
                      count: provider.uploadedCount,
                      color: AppTheme.infoColor,
                    ),
                    _StatChip(
                      label: 'متعلم',
                      count: provider.learnedCount,
                      color: AppTheme.successColor,
                    ),
                  ],
                ),
              ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'ابحث في قاعدة المعرفة...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              provider.clearSearch();
                            },
                          )
                        : null,
                  ),
                  onChanged: (value) {
                    provider.search(value);
                    setState(() {});
                  },
                ),
              ),

              // Content
              Expanded(
                child: _buildContent(provider),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildContent(KnowledgeProvider provider) {
    // Show search results if searching
    if (_searchController.text.length >= 2) {
      if (provider.isSearching) {
        return const Center(child: CircularProgressIndicator());
      }

      if (provider.searchResults.isEmpty) {
        return const Center(
          child: Text('لا توجد نتائج'),
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: provider.searchResults.length,
        itemBuilder: (context, index) {
          return _KnowledgeCard(
            entry: provider.searchResults[index],
            onDelete: () => _confirmDelete(provider.searchResults[index]),
          );
        },
      );
    }

    // Show all entries
    if (provider.isLoading && provider.entries.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.auto_stories_outlined,
              size: 64,
              color: AppTheme.textMuted,
            ),
            const SizedBox(height: 16),
            const Text(
              'قاعدة المعرفة فارغة',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'أضف محادثات لتدريب النظام',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.fetchEntries(refresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: provider.entries.length,
        itemBuilder: (context, index) {
          return _KnowledgeCard(
            entry: provider.entries[index],
            onDelete: () => _confirmDelete(provider.entries[index]),
          );
        },
      ),
    );
  }

  void _showAddDialog(BuildContext context) {
    final clientController = TextEditingController();
    final responseController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('إضافة محادثة'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: clientController,
                decoration: const InputDecoration(
                  labelText: 'رسالة العميل',
                  hintText: 'مثال: دكتور تعبت من الدايت',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: responseController,
                decoration: const InputDecoration(
                  labelText: 'رد الدكتور',
                  hintText: 'مثال: طبيعي، خلينا نعدل النظام',
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (clientController.text.isNotEmpty &&
                  responseController.text.isNotEmpty) {
                final provider = context.read<KnowledgeProvider>();
                final success = await provider.addEntry(
                  clientController.text,
                  responseController.text,
                );
                if (success && context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('تمت الإضافة بنجاح'),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              }
            },
            child: const Text('إضافة'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(KnowledgeEntry entry) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف المحادثة'),
        content: const Text('هل أنت متأكد من حذف هذه المحادثة؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () async {
              final provider = context.read<KnowledgeProvider>();
              await provider.deleteEntry(entry.id);
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatChip({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$count',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _KnowledgeCard extends StatelessWidget {
  final KnowledgeEntry entry;
  final VoidCallback onDelete;

  const _KnowledgeCard({
    required this.entry,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Text(
                  entry.sourceEmoji,
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _getSourceColor(entry.source).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    entry.sourceLabel,
                    style: TextStyle(
                      fontSize: 12,
                      color: _getSourceColor(entry.source),
                    ),
                  ),
                ),
                const Spacer(),
                if (!entry.isInitial)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    color: AppTheme.errorColor,
                    onPressed: onDelete,
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Client Message
            Text(
              'العميل: ${entry.clientMessage}',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
              ),
            ),

            const SizedBox(height: 8),

            // Doctor Response
            Text(
              'الدكتور: ${entry.doctorResponse}',
              style: const TextStyle(fontSize: 14),
            ),

            if (entry.timesRetrieved > 0) ...[
              const SizedBox(height: 8),
              Text(
                'استُخدمت ${entry.timesRetrieved} مرة',
                style: TextStyle(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getSourceColor(String source) {
    switch (source) {
      case 'initial':
        return AppTheme.textMuted;
      case 'uploaded':
        return AppTheme.infoColor;
      case 'learned':
        return AppTheme.successColor;
      default:
        return AppTheme.textMuted;
    }
  }
}
