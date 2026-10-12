class Message {
  final int id;
  final int conversationId;
  final String direction;
  final String content;
  final String contentType;
  final String? whatsappMessageId;
  final String? aiResponse;
  final String? approvedResponse;
  final List<RagExample>? ragExamples;
  final double? similarityScore;
  final String status;
  final DateTime? approvedAt;
  final DateTime? sentAt;
  final DateTime receivedAt;
  final DateTime createdAt;

  // From joined conversation
  final String? clientPhone;
  final String? clientName;
  final int? imageCount;

  Message({
    required this.id,
    required this.conversationId,
    required this.direction,
    required this.content,
    required this.contentType,
    this.whatsappMessageId,
    this.aiResponse,
    this.approvedResponse,
    this.ragExamples,
    this.similarityScore,
    required this.status,
    this.approvedAt,
    this.sentAt,
    required this.receivedAt,
    required this.createdAt,
    this.clientPhone,
    this.clientName,
    this.imageCount,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    List<RagExample>? examples;
    if (json['rag_examples'] != null) {
      if (json['rag_examples'] is List) {
        examples = (json['rag_examples'] as List)
            .map((e) => RagExample.fromJson(e))
            .toList();
      } else if (json['rag_examples'] is String) {
        // Handle JSON string
        examples = [];
      }
    }

    return Message(
      id: json['id'],
      conversationId: json['conversation_id'],
      direction: json['direction'],
      content: json['content'],
      contentType: json['content_type'] ?? 'text',
      whatsappMessageId: json['whatsapp_message_id'],
      aiResponse: json['ai_response'],
      approvedResponse: json['approved_response'],
      ragExamples: examples,
      similarityScore: json['similarity_score'] != null
          ? double.tryParse(json['similarity_score'].toString())
          : null,
      status: json['status'],
      approvedAt: json['approved_at'] != null
          ? DateTime.parse(json['approved_at'])
          : null,
      sentAt: json['sent_at'] != null ? DateTime.parse(json['sent_at']) : null,
      receivedAt: DateTime.parse(json['received_at']),
      createdAt: DateTime.parse(json['created_at']),
      clientPhone: json['client_phone'],
      clientName: json['client_name'],
      imageCount: json['image_count'] != null
          ? int.tryParse(json['image_count'].toString())
          : null,
    );
  }

  bool get isPending => status == 'pending';
  bool get isReady => status == 'ready';
  bool get isSent => status == 'sent';
  bool get isRejected => status == 'rejected';
  bool get hasAiResponse => aiResponse != null && aiResponse!.isNotEmpty;
  bool get hasImages => (imageCount ?? 0) > 0;

  String get displayName => clientName ?? clientPhone ?? 'عميل';

  String get formattedTime {
    final now = DateTime.now();
    final diff = now.difference(receivedAt);

    if (diff.inMinutes < 1) return 'الآن';
    if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
    if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
    if (diff.inDays < 7) return 'منذ ${diff.inDays} يوم';
    return '${receivedAt.day}/${receivedAt.month}';
  }
}

class RagExample {
  final int id;
  final String clientMessage;
  final String doctorResponse;
  final String? category;
  final double similarity;

  RagExample({
    required this.id,
    required this.clientMessage,
    required this.doctorResponse,
    this.category,
    required this.similarity,
  });

  factory RagExample.fromJson(Map<String, dynamic> json) {
    return RagExample(
      id: json['id'],
      clientMessage: json['client_message'],
      doctorResponse: json['doctor_response'],
      category: json['category'],
      similarity: double.tryParse(json['similarity'].toString()) ?? 0.0,
    );
  }

  int get similarityPercent => (similarity * 100).round();
}
