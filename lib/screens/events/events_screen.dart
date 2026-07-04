import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/event_model.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchEvents();
    });
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('EEEE, MMM d, y • h:mm a').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  void _showAddEventModal(BuildContext context, {CompanyEventModel? event}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController(text: event?.title);
    final descCtrl = TextEditingController(text: event?.description);
    final locCtrl = TextEditingController(text: event?.location ?? 'Main Office');
    
    DateTime selectedDateTime = event?.date != null 
        ? DateTime.tryParse(event!.date) ?? DateTime.now() 
        : DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final dateLabel = DateFormat('EEE, MMM d, y').format(selectedDateTime);
            final timeLabel = DateFormat('h:mm a').format(selectedDateTime);

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
                      Text(
                        event == null ? 'Schedule Company Event' : 'Edit Event Details',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Event Title (e.g. Townhall Meeting)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter title' : null,
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: locCtrl,
                        decoration: InputDecoration(
                          labelText: 'Location / Venue',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter location' : null,
                      ),
                      const SizedBox(height: 12),

                      // Date & Time Picker triggers
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final pickedDate = await showDatePicker(
                                  context: context,
                                  initialDate: selectedDateTime,
                                  firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (pickedDate != null) {
                                  setModalState(() {
                                    selectedDateTime = DateTime(
                                      pickedDate.year,
                                      pickedDate.month,
                                      pickedDate.day,
                                      selectedDateTime.hour,
                                      selectedDateTime.minute,
                                    );
                                  });
                                }
                              },
                              icon: const Icon(Icons.calendar_month_rounded, size: 18),
                              label: Text(dateLabel, overflow: TextOverflow.ellipsis),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final pickedTime = await showTimePicker(
                                  context: context,
                                  initialTime: TimeOfDay.fromDateTime(selectedDateTime),
                                );
                                if (pickedTime != null) {
                                  setModalState(() {
                                    selectedDateTime = DateTime(
                                      selectedDateTime.year,
                                      selectedDateTime.month,
                                      selectedDateTime.day,
                                      pickedTime.hour,
                                      pickedTime.minute,
                                    );
                                  });
                                }
                              },
                              icon: const Icon(Icons.access_time_rounded, size: 18),
                              label: Text(timeLabel),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: descCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Event Agenda / Details',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter event description' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          bool success;
                          if (event == null) {
                            success = await hr.createEvent(
                              title: titleCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              date: selectedDateTime.toUtc().toIso8601String(),
                              location: locCtrl.text.trim(),
                            );
                          } else {
                            success = await hr.updateEvent(
                              id: event.id,
                              title: titleCtrl.text.trim(),
                              description: descCtrl.text.trim(),
                              date: selectedDateTime.toUtc().toIso8601String(),
                              location: locCtrl.text.trim(),
                              status: event.status,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Event saved!' : 'Failed to save event.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(event == null ? 'Schedule Event' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
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

  void _confirmDelete(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cancel & Delete Event?'),
          content: const Text('Are you sure you want to delete this event from the calendar permanently?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('No, Keep It', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteEvent(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Event deleted!' : 'Error deleting event.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Yes, Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
          ],
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
        title: const Text('Events & Celebrations', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.isLoading && hr.events.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : hr.events.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.event_note_outlined, size: 48, color: Color(0xFF94A3B8)),
                      SizedBox(height: 12),
                      Text('No upcoming company events scheduled.', style: TextStyle(color: Color(0xFF64748B))),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async => hr.fetchEvents(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: hr.events.length,
                    itemBuilder: (context, index) {
                      final ev = hr.events[index];

                      return Card(
                        elevation: 2,
                        color: Colors.white,
                        shadowColor: const Color(0x100F172A),
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: const BoxDecoration(color: Color(0xFFFEE2E2), shape: BoxShape.circle),
                                    child: const Icon(Icons.celebration_rounded, color: Color(0xFFEF4444)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(ev.title, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15)),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Venue: ${ev.location}',
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w500),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _formatDate(ev.date),
                                          style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isAdminOrHr) ...[
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                                      onSelected: (val) {
                                        if (val == 'edit') {
                                          _showAddEventModal(context, event: ev);
                                        } else if (val == 'delete') {
                                          _confirmDelete(context, ev.id);
                                        }
                                      },
                                      itemBuilder: (context) => [
                                        const PopupMenuItem(
                                          value: 'edit',
                                          child: Row(
                                            children: [
                                              Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                                              SizedBox(width: 8),
                                              Text('Edit Event'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                                              SizedBox(width: 8),
                                              Text('Delete Event', style: TextStyle(color: Colors.redAccent)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                              const Divider(color: Color(0xFFE2E8F0), height: 24),
                              Text(ev.description, style: const TextStyle(color: Color(0xFF334155), fontSize: 13, height: 1.4)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () => _showAddEventModal(context),
              backgroundColor: const Color(0xFF0284C7),
              icon: const Icon(Icons.event_available_rounded, color: Colors.white),
              label: const Text('Add Event', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }
}
