import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/themes/app_theme.dart';
import '../../../../data/models/stats.dart';
import '../../../../data/services/api_service.dart';
import '../../../../data/services/stats_service.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  late final StatsService _statsService;
  OverviewStats? _overview;
  BudgetStatus? _budget;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _statsService = StatsService(context.read<ApiService>());
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _statsService.getOverview(),
        _statsService.getBudget(),
      ]);

      setState(() {
        _overview = results[0] as OverviewStats;
        _budget = results[1] as BudgetStatus;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'فشل تحميل الإحصائيات';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الإحصائيات'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStats,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadStats,
                        child: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadStats,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Budget Card
                      if (_budget != null) _buildBudgetCard(_budget!),

                      const SizedBox(height: 16),

                      // Overview Stats
                      if (_overview != null) ...[
                        const Text(
                          'نظرة عامة',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildOverviewGrid(_overview!),

                        const SizedBox(height: 24),

                        // Knowledge Base Breakdown
                        const Text(
                          'قاعدة المعرفة',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildKnowledgeBreakdown(_overview!),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildBudgetCard(BudgetStatus budget) {
    Color statusColor;
    IconData statusIcon;

    switch (budget.status) {
      case 'critical':
        statusColor = AppTheme.errorColor;
        statusIcon = Icons.warning;
        break;
      case 'warning':
        statusColor = AppTheme.warningColor;
        statusIcon = Icons.info;
        break;
      default:
        statusColor = AppTheme.successColor;
        statusIcon = Icons.check_circle;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor),
                const SizedBox(width: 8),
                const Text(
                  'الميزانية الشهرية',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Progress Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: budget.percentageUsed / 100,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                minHeight: 12,
              ),
            ),

            const SizedBox(height: 12),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'المصروف: \$${budget.spent.toStringAsFixed(2)}',
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'الميزانية: \$${budget.budgetLimit.toStringAsFixed(0)}',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ],
            ),

            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: _StatBox(
                    label: 'المتبقي',
                    value: '\$${budget.remaining.toStringAsFixed(0)}',
                    color: AppTheme.successColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatBox(
                    label: 'المتوقع',
                    value: '\$${budget.projectedTotal.toStringAsFixed(0)}',
                    color: budget.projectedTotal > budget.budgetLimit
                        ? AppTheme.errorColor
                        : AppTheme.infoColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatBox(
                    label: 'يومي',
                    value: '\$${budget.dailyAverage.toStringAsFixed(2)}',
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewGrid(OverviewStats overview) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          icon: Icons.message,
          label: 'إجمالي الرسائل',
          value: overview.totalMessages.toString(),
          color: AppTheme.primaryColor,
        ),
        _StatCard(
          icon: Icons.people,
          label: 'المحادثات',
          value: overview.totalConversations.toString(),
          color: AppTheme.infoColor,
        ),
        _StatCard(
          icon: Icons.pending,
          label: 'معلّقة',
          value: overview.pendingMessages.toString(),
          color: AppTheme.warningColor,
        ),
        _StatCard(
          icon: Icons.today,
          label: 'اليوم',
          value: overview.todayMessages.toString(),
          color: AppTheme.successColor,
        ),
      ],
    );
  }

  Widget _buildKnowledgeBreakdown(OverviewStats overview) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.auto_stories, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  '${overview.knowledgeBaseSize} محادثة',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: overview.knowledgeBreakdown.map((source) {
                return _SourceChip(
                  label: _getSourceLabel(source.source),
                  count: source.count,
                  color: _getSourceColor(source.source),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _getSourceLabel(String source) {
    switch (source) {
      case 'initial':
        return 'أساسي';
      case 'uploaded':
        return 'مرفوع';
      case 'learned':
        return 'متعلم';
      default:
        return source;
    }
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

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatBox({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
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

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SourceChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _SourceChip({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            count.toString(),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: color,
          ),
        ),
      ],
    );
  }
}
