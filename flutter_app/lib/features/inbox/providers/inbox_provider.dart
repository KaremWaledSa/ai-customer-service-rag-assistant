import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../core/constants/api_constants.dart';
import '../../../data/models/message.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/websocket_service.dart';

class InboxProvider with ChangeNotifier {
  final ApiService _apiService;
  final WebSocketService _websocketService;

  List<Message> _pendingMessages = [];
  Message? _selectedMessage;
  bool _isLoading = false;
  String? _error;
  StreamSubscription? _wsSubscription;

  InboxProvider(this._apiService, this._websocketService) {
    _listenToWebSocket();
  }

  List<Message> get pendingMessages => _pendingMessages;
  Message? get selectedMessage => _selectedMessage;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get pendingCount => _pendingMessages.length;

  void _listenToWebSocket() {
    _wsSubscription = _websocketService.messageStream.listen((message) {
      switch (message['type']) {
        case 'new_message':
          _handleNewMessage(message['data']);
          break;
        case 'response_ready':
          _handleResponseReady(message['data']);
          break;
        case 'status_update':
          _handleStatusUpdate(message['data']);
          break;
      }
    });
  }

  void _handleNewMessage(Map<String, dynamic> data) {
    final message = Message.fromJson(data);
    _pendingMessages.insert(0, message);
    notifyListeners();
  }

  void _handleResponseReady(Map<String, dynamic> data) {
    final index = _pendingMessages.indexWhere((m) => m.id == data['id']);
    if (index != -1) {
      // Update the message with AI response
      fetchPendingMessages(); // Refresh to get full data
    }
  }

  void _handleStatusUpdate(Map<String, dynamic> data) {
    final id = data['id'];
    final status = data['status'];

    if (status == 'sent' || status == 'rejected') {
      _pendingMessages.removeWhere((m) => m.id == id);
      if (_selectedMessage?.id == id) {
        _selectedMessage = null;
      }
      notifyListeners();
    }
  }

  Future<void> fetchPendingMessages() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('[InboxProvider] Fetching pending messages...');
      final response = await _apiService.get(ApiConstants.pendingMessages);
      debugPrint('[InboxProvider] Response status: ${response.statusCode}');
      debugPrint('[InboxProvider] Response data: ${response.data}');

      if (response.statusCode == 200) {
        final data = response.data['messages'];
        if (data == null) {
          debugPrint('[InboxProvider] ERROR: messages is null in response');
          _error = 'البيانات غير صحيحة';
        } else if (data is! List) {
          debugPrint('[InboxProvider] ERROR: messages is not a List, got: ${data.runtimeType}');
          _error = 'البيانات غير صحيحة';
        } else {
          debugPrint('[InboxProvider] Parsing ${data.length} messages...');
          _pendingMessages = data.map((json) => Message.fromJson(json)).toList();
          debugPrint('[InboxProvider] SUCCESS: Loaded ${_pendingMessages.length} messages');
        }
      } else {
        debugPrint('[InboxProvider] ERROR: Unexpected status code ${response.statusCode}');
        _error = 'فشل تحميل الرسائل (${response.statusCode})';
      }
    } catch (e, stackTrace) {
      debugPrint('[InboxProvider] EXCEPTION: $e');
      debugPrint('[InboxProvider] Stack trace: $stackTrace');
      _error = 'فشل تحميل الرسائل: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> selectMessage(int messageId) async {
    try {
      final response = await _apiService.get(ApiConstants.messageById(messageId));
      if (response.statusCode == 200) {
        _selectedMessage = Message.fromJson(response.data['message']);
        notifyListeners();
      }
    } catch (e) {
      _error = 'فشل تحميل الرسالة';
      notifyListeners();
    }
  }

  Future<bool> generateResponse(int messageId) async {
    try {
      final response = await _apiService.post(ApiConstants.generateResponse(messageId));
      if (response.statusCode == 200) {
        // Refresh the selected message
        await selectMessage(messageId);
        return true;
      }
    } catch (e) {
      _error = 'فشل توليد الرد';
      notifyListeners();
    }
    return false;
  }

  Future<bool> approveMessage(int messageId) async {
    try {
      final response = await _apiService.post(ApiConstants.approveMessage(messageId));
      if (response.statusCode == 200) {
        _pendingMessages.removeWhere((m) => m.id == messageId);
        _selectedMessage = null;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _error = 'فشل الموافقة';
      notifyListeners();
    }
    return false;
  }

  Future<bool> editAndSend(int messageId, String editedResponse) async {
    try {
      final response = await _apiService.post(
        ApiConstants.editMessage(messageId),
        data: {'response': editedResponse},
      );
      if (response.statusCode == 200) {
        _pendingMessages.removeWhere((m) => m.id == messageId);
        _selectedMessage = null;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _error = 'فشل الإرسال';
      notifyListeners();
    }
    return false;
  }

  Future<bool> rejectMessage(int messageId) async {
    try {
      final response = await _apiService.post(ApiConstants.rejectMessage(messageId));
      if (response.statusCode == 200) {
        _pendingMessages.removeWhere((m) => m.id == messageId);
        _selectedMessage = null;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _error = 'فشل الرفض';
      notifyListeners();
    }
    return false;
  }

  void clearSelection() {
    _selectedMessage = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}
