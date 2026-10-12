import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/api_constants.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  bool _isConnected = false;
  Timer? _reconnectTimer;
  String? _userId;

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  bool get isConnected => _isConnected;

  void connect(String? userId) {
    _userId = userId;
    _doConnect();
  }

  void _doConnect() {
    try {
      final url = ApiConstants.websocketUrl(_userId);
      _channel = WebSocketChannel.connect(Uri.parse(url));

      _channel!.stream.listen(
        (data) {
          _isConnected = true;
          try {
            final message = jsonDecode(data);
            _messageController.add(message);
          } catch (e) {
            print('WebSocket parse error: $e');
          }
        },
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
          _scheduleReconnect();
        },
        onDone: () {
          print('WebSocket closed');
          _isConnected = false;
          _scheduleReconnect();
        },
      );

      print('WebSocket connecting to: ${ApiConstants.websocketUrl(_userId)}');
    } catch (e) {
      print('WebSocket connection error: $e');
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      if (!_isConnected) {
        _doConnect();
      }
    });
  }

  void send(Map<String, dynamic> data) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(data));
    }
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}
