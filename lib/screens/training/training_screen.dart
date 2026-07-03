import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  final _feedbackFormKey = GlobalKey<FormState>();
  final _commentCtrl = TextEditingController();
  double _rating = 5.0;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  void _showFeedbackModal(BuildContext context, String programId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 20,
              ),
              child: Form(
                key: _feedbackFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Training Feedback',
                      style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),

                    // Slider for Rating
                    Text(
                      'Rating: ${_rating.toStringAsFixed(0)} / 5',
                      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14),
                    ),
                    Slider(
                      value: _rating,
                      min: 1.0,
                      max: 5.0,
                      divisions: 4,
                      activeColor: const Color(0xFFF43F5E),
                      inactiveColor: const Color(0xFFE2E8F0),
                      onChanged: (val) {
                        setModalState(() {
                          _rating = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // Comments
                    TextFormField(
                      controller: _commentCtrl,
                      maxLines: 3,
                      style: const TextStyle(color: Color(0xFF0F172A)),
                      decoration: InputDecoration(
                        labelText: 'Your comments',
                        labelStyle: const TextStyle(color: Color(0xFF64748B)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                      ),
                      validator: (value) => value == null || value.trim().isEmpty ? 'Enter comments' : null,
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: () {
                        if (!_feedbackFormKey.currentState!.validate()) return;
                        // Submit feedback
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Feedback submitted! Thank you.')),
                        );
                        _commentCtrl.clear();
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF43F5E),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Submit Feedback', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final empId = auth.currentUser?.empId ?? '';

    // Mock List representing Training assignments populated
    final List<Map<String, dynamic>> mockedTrainings = [
      {
        'id': 'prog_1',
        'title': 'Corporate Security Compliance 2026',
        'desc': 'Essential protocols for digital infrastructure and whitelisting procedures.',
        'status': 'Completed',
        'hasCertificate': true,
      },
      {
        'id': 'prog_2',
        'title': 'Advanced Flutter Architecture Patterns',
        'desc': 'Modular states routing, Dio networking, and Socket integrations.',
        'status': 'Ongoing',
        'hasCertificate': false,
      }
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Learning & Development', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: mockedTrainings.length,
        itemBuilder: (context, index) {
          final prog = mockedTrainings[index];
          final title = prog['title'] ?? '';
          final desc = prog['desc'] ?? '';
          final status = prog['status'] ?? 'Ongoing';
          final hasCert = prog['hasCertificate'] ?? false;
          final progId = prog['id'] ?? '';

          return Card(
            elevation: 2,
            color: Colors.white,
            shadowColor: const Color(0x100F172A),
            margin: const EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (status == 'Completed' ? const Color(0xFF10B981) : Colors.blueAccent).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            color: status == 'Completed' ? const Color(0xFF10B981) : Colors.blue[800],
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    desc,
                    style: const TextStyle(color: Color(0xFF475569), fontSize: 13),
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 24),
                  
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton.icon(
                        onPressed: () => _showFeedbackModal(context, progId),
                        icon: const Icon(Icons.rate_review_rounded, size: 16, color: Color(0xFF2563EB)),
                        label: const Text('Feedback', style: TextStyle(color: Color(0xFF2563EB))),
                      ),
                      if (hasCert) ...[
                        ElevatedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Downloading Certificate for Employee: $empId...')),
                            );
                          },
                          icon: const Icon(Icons.workspace_premium_rounded, size: 16),
                          label: const Text('Get Certificate'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF43F5E),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        )
                      ]
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
