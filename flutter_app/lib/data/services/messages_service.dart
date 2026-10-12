import '../../core/constants/api_constants.dart';
import '../models/message.dart';
import 'api_service.dart';

class MessagesService {
  final ApiService _apiService;

  MessagesService(this._apiService);

  Future<List<Message>> getPendingMessages() async {
    final response = await _apiService.get(ApiConstants.pendingMessages);
    if (response.statusCode == 200) {
      final List<dynamic> data = response.data['messages'];
      return data.map((json) => Message.fromJson(json)).toList();
    }
    throw Exception('Failed to get pending messages');
  }

  Future<Message> getMessageById(int id) async {
    final response = await _apiService.get(ApiConstants.messageById(id));
    if (response.statusCode == 200) {
      return Message.fromJson(response.data['message']);
    }
    throw Exception('Failed to get message');
  }

  Future<Map<String, dynamic>> generateResponse(int messageId) async {
    final response = await _apiService.post(ApiConstants.generateResponse(messageId));
    if (response.statusCode == 200) {
      return response.data;
    }
    throw Exception('Failed to generate response');
  }

  Future<bool> approveMessage(int messageId) async {
    final response = await _apiService.post(ApiConstants.approveMessage(messageId));
    return response.statusCode == 200;
  }

  Future<bool> editAndSend(int messageId, String editedResponse) async {
    final response = await _apiService.post(
      ApiConstants.editMessage(messageId),
      data: {'response': editedResponse},
    );
    return response.statusCode == 200;
  }

  Future<bool> rejectMessage(int messageId) async {
    final response = await _apiService.post(ApiConstants.rejectMessage(messageId));
    return response.statusCode == 200;
  }

  Future<List<Message>> getHistory({int page = 1, int limit = 20}) async {
    final response = await _apiService.get(
      ApiConstants.messageHistory,
      queryParams: {'page': page, 'limit': limit},
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = response.data['messages'];
      return data.map((json) => Message.fromJson(json)).toList();
    }
    throw Exception('Failed to get message history');
  }
}
