class ApiConstants {
  // Base URL - Change this for production
  static const String baseUrl = 'http://localhost:3001';

  // API Endpoints
  static const String apiPrefix = '/api';

  // Auth
  static const String login = '$apiPrefix/auth/login';
  static const String refresh = '$apiPrefix/auth/refresh';
  static const String me = '$apiPrefix/auth/me';

  // Messages
  static const String pendingMessages = '$apiPrefix/messages/pending';
  static String messageById(int id) => '$apiPrefix/messages/$id';
  static String generateResponse(int id) => '$apiPrefix/messages/$id/generate';
  static String approveMessage(int id) => '$apiPrefix/messages/$id/approve';
  static String editMessage(int id) => '$apiPrefix/messages/$id/edit';
  static String rejectMessage(int id) => '$apiPrefix/messages/$id/reject';
  static const String messageHistory = '$apiPrefix/messages/history';

  // Knowledge Base
  static const String knowledge = '$apiPrefix/knowledge';
  static const String knowledgeSearch = '$apiPrefix/knowledge/search';
  static const String knowledgeBulk = '$apiPrefix/knowledge/bulk';
  static String knowledgeById(int id) => '$apiPrefix/knowledge/$id';

  // Images
  static const String analyzeImage = '$apiPrefix/images/analyze';
  static const String analyzeBase64 = '$apiPrefix/images/analyze-base64';
  static String imageById(int id) => '$apiPrefix/images/$id';

  // Stats
  static const String statsUsage = '$apiPrefix/stats/usage';
  static const String statsDaily = '$apiPrefix/stats/daily';
  static const String statsOverview = '$apiPrefix/stats/overview';
  static const String statsBudget = '$apiPrefix/stats/budget';

  // WebSocket
  static String websocketUrl(String? userId) =>
      '${baseUrl.replaceFirst('http', 'ws')}/ws${userId != null ? '?userId=$userId' : ''}';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
