import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/helpdesk.dart';

class HelpdeskScreen extends StatefulWidget {
  const HelpdeskScreen({super.key});

  @override
  State<HelpdeskScreen> createState() => _HelpdeskScreenState();
}

class _HelpdeskScreenState extends State<HelpdeskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _selectedCategory = 'IT Support';
  String _selectedPriority = 'Medium';

  final List<String> _categories = ['IT Support', 'Software Access', 'Hardware Request', 'Payroll & Compensation', 'HR & Benefits', 'Other'];
  final List<String> _priorities = ['Low', 'Medium', 'High', 'Urgent'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchMyTickets();
    });
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final hr = Provider.of<HrProvider>(context, listen: false);
    final success = await hr.submitTicket(
      _titleCtrl.text.trim(),
      _descCtrl.text.trim(),
      _selectedCategory,
      _selectedPriority,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Support ticket raised!'), backgroundColor: Colors.green),
      );
      _titleCtrl.clear();
      _descCtrl.clear();
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(hr.errorMessage ?? 'Failed to raise ticket.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showRaiseModal(BuildContext context) {
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
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Raise Support Ticket',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _titleCtrl,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Subject Title',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Enter subject' : null,
                      ),
                      const SizedBox(height: 16),

                      DropdownButtonFormField<String>(
                        initialValue: _selectedCategory,
                        decoration: InputDecoration(
                          labelText: 'Category',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => _selectedCategory = val);
                        },
                      ),
                      const SizedBox(height: 16),

                      DropdownButtonFormField<String>(
                        initialValue: _selectedPriority,
                        decoration: InputDecoration(
                          labelText: 'Priority Level',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _priorities.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => _selectedPriority = val);
                        },
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _descCtrl,
                        maxLines: 3,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Elaborate issue details',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Enter description' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF43F5E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Submit Ticket', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showResolveTicketModal(BuildContext context, HelpdeskTicket ticket) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final notesCtrl = TextEditingController(text: ticket.resolutionNotes ?? '');
    String status = ticket.status.toLowerCase() == 'open' ? 'Resolved' : ticket.status;

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
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Resolve Support Ticket',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text('Subject: ${ticket.title}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      const SizedBox(height: 16),

                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: InputDecoration(
                          labelText: 'Update Status',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'In Progress', child: Text('In Progress')),
                          DropdownMenuItem(value: 'Resolved', child: Text('Resolved & Closed')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => status = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: notesCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Resolution Note / Action Taken',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter resolution notes' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final success = await hr.updateTicketStatus(
                            ticketId: ticket.id,
                            status: status,
                            resolutionNotes: notesCtrl.text.trim(),
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Ticket resolved successfully!' : 'Failed to update ticket.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Save & Resolve Ticket', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
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
    final hr = Provider.of<HrProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Helpdesk Tickets', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.isLoading && hr.myTickets.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : hr.myTickets.isEmpty
              ? const Center(
                  child: Text(
                    'No IT support tickets raised.',
                    style: TextStyle(color: Color(0xFF64748B)),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: hr.myTickets.length,
                  itemBuilder: (context, index) {
                    final ticket = hr.myTickets[index];
                    final isResolved = ticket.status.toLowerCase() == 'resolved' || ticket.status.toLowerCase() == 'closed';
                    
                    return Card(
                      elevation: 2,
                      color: Colors.white,
                      shadowColor: const Color(0x100F172A),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    ticket.title,
                                    style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                _buildStatusBadge(ticket.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Category: ${ticket.category} • Priority: ${ticket.priority}',
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              ticket.description,
                              style: const TextStyle(color: Color(0xFF475569), fontSize: 13),
                            ),
                            if (ticket.resolutionNotes != null && ticket.resolutionNotes!.isNotEmpty) ...[
                              const Divider(color: Color(0xFFE2E8F0), height: 24),
                              Text(
                                'Resolution note: ${ticket.resolutionNotes}',
                                style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ],

                            if (isAdminOrHr && !isResolved) ...[
                              const SizedBox(height: 12),
                              ElevatedButton.icon(
                                onPressed: () => _showResolveTicketModal(context, ticket),
                                icon: const Icon(Icons.check_circle_rounded, size: 16, color: Colors.white),
                                label: const Text('Resolve Ticket & Add Note', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF10B981),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: isAdminOrHr
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _showRaiseModal(context),
              backgroundColor: const Color(0xFFF43F5E),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Raise Ticket', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'resolved':
      case 'closed':
        color = const Color(0xFF10B981);
        break;
      case 'open':
        color = Colors.amber;
        break;
      case 'in-progress':
        color = Colors.blueAccent;
        break;
      default:
        color = Colors.blueGrey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
