class KnowledgeEntry {
  final int id;
  final String clientMessage;
  final String doctorResponse;
  final String? category;
  final String source;
  final int timesRetrieved;
  final DateTime createdAt;

  KnowledgeEntry({
    required this.id,
    required this.clientMessage,
    required this.doctorResponse,
    this.category,
    required this.source,
    required this.timesRetrieved,
    required this.createdAt,
  });

  factory KnowledgeEntry.fromJson(Map<String, dynamic> json) {
    return KnowledgeEntry(
      id: json['id'],
      clientMessage: json['client_message'],
      doctorResponse: json['doctor_response'],
      category: json['category'],
      source: json['source'] ?? 'learned',
      timesRetrieved: json['times_retrieved'] ?? 0,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'client_message': clientMessage,
      'doctor_response': doctorResponse,
      'category': category,
      'source': source,
      'times_retrieved': timesRetrieved,
      'created_at': createdAt.toIso8601String(),
    };
  }

  bool get isInitial => source == 'initial';
  bool get isUploaded => source == 'uploaded';
  bool get isLearned => source == 'learned';

  String get sourceLabel {
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

  String get sourceEmoji {
    switch (source) {
      case 'initial':
        return '📋';
      case 'uploaded':
        return '📤';
      case 'learned':
        return '🧠';
      default:
        return '📝';
    }
  }
}
