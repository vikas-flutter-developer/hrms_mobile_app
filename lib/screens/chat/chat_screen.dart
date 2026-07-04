import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/hr_provider.dart';
import '../../services/socket_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _socketService = SocketService();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, dynamic>> _liveSocketMessages = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchGlobalMessages();
    });

    _socketService.connect();
    _socketService.onMessageReceived = (msg) {
      if (mounted) {
        setState(() {
          _liveSocketMessages.add(msg);
        });
        _scrollToBottom();
      }
    };
  }

  @override
  void dispose() {
    _socketService.disconnect();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final hr = Provider.of<HrProvider>(context, listen: false);
    final senderName = auth.currentUser?.name ?? 'Employee';

    _messageController.clear();

    // Broadcast via socket for real-time peers & save to MongoDB Atlas via REST
    _socketService.sendMessage(senderName, text);
    await hr.sendGlobalMessage(text);
    _scrollToBottom();
  }

  String _extractSenderName(Map<String, dynamic> msg) {
    if (msg['senderName'] != null) return msg['senderName'].toString();
    if (msg['sender'] is Map) {
      final s = msg['sender'];
      return s['name']?.toString() ?? s['companyName']?.toString() ?? 'Team Member';
    }
    return 'Team Member';
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final hr = Provider.of<HrProvider>(context);
    final currentUserId = auth.currentUser?.id ?? '';
    final currentUserName = auth.currentUser?.name ?? 'Employee';

    // Combine MongoDB fetched messages + live socket messages
    final allMessages = [...hr.chatMessages, ..._liveSocketMessages];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Live Team Chat', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Column(
        children: [
          Expanded(
            child: hr.isLoading && allMessages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : allMessages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.forum_outlined, size: 48, color: Color(0xFF94A3B8)),
                            SizedBox(height: 12),
                            Text('No messages in team channel yet. Start chatting!', style: TextStyle(color: Color(0xFF64748B))),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: allMessages.length,
                        itemBuilder: (context, index) {
                          final msg = allMessages[index];
                          final senderName = _extractSenderName(msg);
                          final content = msg['content']?.toString() ?? '';

                          String senderId = '';
                          if (msg['sender'] is Map) {
                            senderId = msg['sender']['_id']?.toString() ?? '';
                          } else if (msg['sender'] != null) {
                            senderId = msg['sender'].toString();
                          }

                          final isMe = (senderId.isNotEmpty && senderId == currentUserId) || (senderName == currentUserName);

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              decoration: BoxDecoration(
                                color: isMe ? const Color(0xFF0284C7) : Colors.white,
                                border: isMe ? null : Border.all(color: const Color(0xFFE2E8F0)),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x080F172A),
                                    blurRadius: 4,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(14),
                                  topRight: const Radius.circular(14),
                                  bottomLeft: isMe ? const Radius.circular(14) : const Radius.circular(2),
                                  bottomRight: isMe ? const Radius.circular(2) : const Radius.circular(14),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!isMe) ...[
                                    Text(
                                      senderName,
                                      style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 4),
                                  ],
                                  Text(
                                    content,
                                    style: TextStyle(color: isMe ? Colors.white : const Color(0xFF0F172A), fontSize: 13, height: 1.3),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Message Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(
                      hintText: 'Type your message...',
                      hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                      border: InputBorder.none,
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: Color(0xFF0284C7)),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
