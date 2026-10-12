class OverviewStats {
  final int totalMessages;
  final int totalConversations;
  final int knowledgeBaseSize;
  final int pendingMessages;
  final int todayMessages;
  final List<SourceCount> knowledgeBreakdown;
  final List<CategoryCount> topCategories;
  final int connectedClients;

  OverviewStats({
    required this.totalMessages,
    required this.totalConversations,
    required this.knowledgeBaseSize,
    required this.pendingMessages,
    required this.todayMessages,
    required this.knowledgeBreakdown,
    required this.topCategories,
    required this.connectedClients,
  });

  factory OverviewStats.fromJson(Map<String, dynamic> json) {
    return OverviewStats(
      totalMessages: json['total_messages'] ?? 0,
      totalConversations: json['total_conversations'] ?? 0,
      knowledgeBaseSize: json['knowledge_base_size'] ?? 0,
      pendingMessages: json['pending_messages'] ?? 0,
      todayMessages: json['today_messages'] ?? 0,
      knowledgeBreakdown: (json['knowledge_breakdown'] as List?)
              ?.map((e) => SourceCount.fromJson(e))
              .toList() ??
          [],
      topCategories: (json['top_categories'] as List?)
              ?.map((e) => CategoryCount.fromJson(e))
              .toList() ??
          [],
      connectedClients: json['connected_clients'] ?? 0,
    );
  }
}

class SourceCount {
  final String source;
  final int count;

  SourceCount({required this.source, required this.count});

  factory SourceCount.fromJson(Map<String, dynamic> json) {
    return SourceCount(
      source: json['source'] ?? 'unknown',
      count: int.tryParse(json['count'].toString()) ?? 0,
    );
  }
}

class CategoryCount {
  final String category;
  final int count;

  CategoryCount({required this.category, required this.count});

  factory CategoryCount.fromJson(Map<String, dynamic> json) {
    return CategoryCount(
      category: json['category'] ?? 'unknown',
      count: int.tryParse(json['count'].toString()) ?? 0,
    );
  }
}

class BudgetStatus {
  final double budgetLimit;
  final double spent;
  final double remaining;
  final double percentageUsed;
  final double projectedTotal;
  final double dailyAverage;
  final String status;

  BudgetStatus({
    required this.budgetLimit,
    required this.spent,
    required this.remaining,
    required this.percentageUsed,
    required this.projectedTotal,
    required this.dailyAverage,
    required this.status,
  });

  factory BudgetStatus.fromJson(Map<String, dynamic> json) {
    return BudgetStatus(
      budgetLimit: (json['budget_limit'] as num?)?.toDouble() ?? 200,
      spent: (json['spent'] as num?)?.toDouble() ?? 0,
      remaining: (json['remaining'] as num?)?.toDouble() ?? 200,
      percentageUsed: (json['percentage_used'] as num?)?.toDouble() ?? 0,
      projectedTotal: (json['projected_total'] as num?)?.toDouble() ?? 0,
      dailyAverage: (json['daily_average'] as num?)?.toDouble() ?? 0,
      status: json['status'] ?? 'ok',
    );
  }

  bool get isOk => status == 'ok';
  bool get isWarning => status == 'warning';
  bool get isCritical => status == 'critical';
}

class DailyUsage {
  final DateTime date;
  final int embeddingsTokens;
  final int chatTokensInput;
  final int chatTokensOutput;
  final int visionTokens;
  final double embeddingsCost;
  final double chatCost;
  final double visionCost;
  final double whatsappCost;
  final int messagesReceived;
  final int messagesSent;
  final int imagesProcessed;

  DailyUsage({
    required this.date,
    required this.embeddingsTokens,
    required this.chatTokensInput,
    required this.chatTokensOutput,
    required this.visionTokens,
    required this.embeddingsCost,
    required this.chatCost,
    required this.visionCost,
    required this.whatsappCost,
    required this.messagesReceived,
    required this.messagesSent,
    required this.imagesProcessed,
  });

  factory DailyUsage.fromJson(Map<String, dynamic> json) {
    return DailyUsage(
      date: DateTime.parse(json['date']),
      embeddingsTokens: json['embeddings_tokens'] ?? 0,
      chatTokensInput: json['chat_tokens_input'] ?? 0,
      chatTokensOutput: json['chat_tokens_output'] ?? 0,
      visionTokens: json['vision_tokens'] ?? 0,
      embeddingsCost: (json['embeddings_cost'] as num?)?.toDouble() ?? 0,
      chatCost: (json['chat_cost'] as num?)?.toDouble() ?? 0,
      visionCost: (json['vision_cost'] as num?)?.toDouble() ?? 0,
      whatsappCost: (json['whatsapp_cost'] as num?)?.toDouble() ?? 0,
      messagesReceived: json['messages_received'] ?? 0,
      messagesSent: json['messages_sent'] ?? 0,
      imagesProcessed: json['images_processed'] ?? 0,
    );
  }

  double get totalCost => embeddingsCost + chatCost + visionCost + whatsappCost;
}
