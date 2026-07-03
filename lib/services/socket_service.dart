import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  io.Socket? _socket;
  
  // Handlers
  void Function(Map<String, dynamic> message)? onMessageReceived;

  SocketService._internal();

  void connect() {
    // Extract base URL schema from Api URL (e.g. http://10.0.2.2:5000)
    final socketUrl = AppConstants.apiBaseUrl.replaceAll('/api', '');
    
    _socket = io.io(
      socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket']) // Use websocket first
          .disableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      print('[Socket] Connected successfully');
    });

    _socket!.onDisconnect((_) {
      print('[Socket] Disconnected');
    });

    _socket!.on('receiveMessage', (data) {
      if (onMessageReceived != null && data is Map<String, dynamic>) {
        onMessageReceived!(data);
      }
    });

    _socket!.connect();
  }

  void sendMessage(String senderName, String content) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('sendMessage', {
        'senderName': senderName,
        'content': content,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
