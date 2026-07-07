import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/announcement.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  String _selectedDepartmentFilter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchAnnouncements();
    });
  }

  void _showAddAnnouncementModal(BuildContext context, {AnnouncementModel? announcement}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController(text: announcement?.title);
    final msgCtrl = TextEditingController(text: announcement?.message);
    String audience = announcement?.targetAudience ?? 'All';
    String? visibleForHours = announcement?.visibleForHours?.toString() ?? '168'; // Default: 7 days
    bool isPinned = announcement?.isPinned ?? false;

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
                      Text(
                        announcement == null ? 'Post Official Announcement' : 'Edit Announcement',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Broadcast a company notice. It will auto-expire after the chosen duration.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Announcement Title',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter title' : null,
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: audience,
                        decoration: InputDecoration(
                          labelText: 'Target Audience',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'All', child: Text('All Company Employees')),
                          DropdownMenuItem(value: 'Specific Department', child: Text('Engineering & IT Dept')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => audience = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Visibility Duration Selector
                      DropdownButtonFormField<String>(
                        value: visibleForHours,
                        decoration: InputDecoration(
                          labelText: '⏱ Visible For (Auto-Expire After)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          prefixIcon: const Icon(Icons.timer_outlined, color: Color(0xFF0284C7)),
                        ),
                        items: const [
                          DropdownMenuItem(value: '24', child: Text('24 Hours (1 Day)')),
                          DropdownMenuItem(value: '48', child: Text('48 Hours (2 Days)')),
                          DropdownMenuItem(value: '72', child: Text('72 Hours (3 Days)')),
                          DropdownMenuItem(value: '168', child: Text('1 Week (7 Days)')),
                          DropdownMenuItem(value: '336', child: Text('2 Weeks (14 Days)')),
                          DropdownMenuItem(value: '720', child: Text('1 Month (30 Days)')),
                          DropdownMenuItem(value: null, child: Text('Permanent (No Expiry)')),
                        ],
                        onChanged: (val) {
                          setModalState(() => visibleForHours = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Switch list tile for Pinned status
                      SwitchListTile(
                        title: const Text('Pin Announcement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: const Text('Display at the top of the feed', style: TextStyle(fontSize: 11)),
                        value: isPinned,
                        activeColor: const Color(0xFF0284C7),
                        contentPadding: EdgeInsets.zero,
                        onChanged: (val) {
                          setModalState(() => isPinned = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: msgCtrl,
                        maxLines: 4,
                        decoration: InputDecoration(
                          labelText: 'Notice Message Details',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter message details' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          bool success;
                          if (announcement == null) {
                            success = await hr.createAnnouncement(
                              titleCtrl.text.trim(),
                              msgCtrl.text.trim(),
                              audience,
                              visibleForHours: visibleForHours != null ? int.tryParse(visibleForHours!) : null,
                              isPinned: isPinned,
                            );
                          } else {
                            success = await hr.updateAnnouncement(
                              id: announcement.id,
                              title: titleCtrl.text.trim(),
                              message: msgCtrl.text.trim(),
                              audience: audience,
                              visibleForHours: visibleForHours != null ? int.tryParse(visibleForHours!) : null,
                              isPinned: isPinned,
                            );
                          }
                          
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Announcement saved!' : 'Failed to save announcement.'),
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
                        child: Text(announcement == null ? 'Publish Announcement' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
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

  Color _audienceColor(String audience) {
    switch (audience) {
      case 'All': return const Color(0xFF10B981);
      case 'Specific Department': return const Color(0xFF8B5CF6);
      default: return const Color(0xFF0284C7);
    }
  }

  IconData _titleIcon(String title) {
    if (title.contains('🏢') || title.contains('Townhall')) return Icons.business_rounded;
    if (title.contains('Holiday') || title.contains('🌴')) return Icons.beach_access_rounded;
    if (title.contains('🚀') || title.contains('Launch')) return Icons.rocket_launch_rounded;
    if (title.contains('🔒') || title.contains('Security')) return Icons.security_rounded;
    if (title.contains('🏥') || title.contains('Health')) return Icons.local_hospital_rounded;
    if (title.contains('💡') || title.contains('Hackathon')) return Icons.lightbulb_rounded;
    if (title.contains('🏆') || title.contains('Award')) return Icons.emoji_events_rounded;
    if (title.contains('⚽') || title.contains('Sports')) return Icons.sports_soccer_rounded;
    return Icons.campaign_rounded;
  }

  void _confirmDelete(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Announcement?'),
          content: const Text('Are you sure you want to remove this announcement permanently from the Notice Board?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteAnnouncement(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Announcement removed!' : 'Error deleting announcement.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
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

    // Local filtering by department
    final filteredAnnouncements = hr.announcements.where((anc) {
      if (_selectedDepartmentFilter == 'All') return true;
      if (anc.targetAudience == 'All') return true;
      if (anc.targetAudience == 'Specific Department') {
        return anc.targetDepartments.contains(_selectedDepartmentFilter);
      }
      return false;
    }).toList();

    // Sort by pinned status (pinned first)
    filteredAnnouncements.sort((a, b) {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Notice Board', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Column(
        children: [
          // Department Filter Dropdown
          DecoratedBox(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  const Icon(Icons.filter_alt_rounded, color: Color(0xFF64748B), size: 18),
                  const SizedBox(width: 6),
                  const Text(
                    'Scope Filter:',
                    style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedDepartmentFilter,
                      icon: const Icon(Icons.arrow_drop_down_rounded, color: Color(0xFF0F172A)),
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 12),
                      onChanged: (String? newValue) {
                        if (newValue != null) {
                          setState(() {
                            _selectedDepartmentFilter = newValue;
                          });
                        }
                      },
                      items: const [
                        DropdownMenuItem(value: 'All', child: Text('All Notices')),
                        DropdownMenuItem(value: 'Engineering', child: Text('Engineering')),
                        DropdownMenuItem(value: 'IT', child: Text('IT')),
                        DropdownMenuItem(value: 'Sales', child: Text('Sales')),
                        DropdownMenuItem(value: 'HR', child: Text('HR')),
                        DropdownMenuItem(value: 'Finance', child: Text('Finance')),
                        DropdownMenuItem(value: 'Marketing', child: Text('Marketing')),
                        DropdownMenuItem(value: 'Operations', child: Text('Operations')),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          ),
          Expanded(
            child: hr.isLoading && filteredAnnouncements.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : filteredAnnouncements.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.campaign_outlined, size: 56, color: Color(0xFF94A3B8)),
                            SizedBox(height: 12),
                            Text('No active announcements found.', style: TextStyle(color: Color(0xFF64748B), fontSize: 15)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async => hr.fetchAnnouncements(),
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                          itemCount: filteredAnnouncements.length,
                          itemBuilder: (context, index) {
                            final anc = filteredAnnouncements[index];
                            final audienceColor = _audienceColor(anc.targetAudience);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF0F172A).withValues(alpha: 0.06),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Colored top accent bar
                                  Container(
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: anc.isPinned ? Colors.redAccent : audienceColor,
                                      borderRadius: const BorderRadius.only(
                                        topLeft: Radius.circular(18),
                                        topRight: Radius.circular(18),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: (anc.isPinned ? Colors.redAccent : audienceColor).withValues(alpha: 0.12),
                                                shape: BoxShape.circle,
                                              ),
                                              child: Icon(
                                                anc.isPinned ? Icons.push_pin_rounded : _titleIcon(anc.title),
                                                color: anc.isPinned ? Colors.redAccent : audienceColor,
                                                size: 20,
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  if (anc.isPinned) ...[
                                                    Row(
                                                      children: [
                                                        const Icon(Icons.push_pin_rounded, color: Colors.redAccent, size: 12),
                                                        const SizedBox(width: 4),
                                                        Text(
                                                          'PINNED NOTICE',
                                                          style: TextStyle(
                                                            color: Colors.redAccent.withOpacity(0.9),
                                                            fontWeight: FontWeight.bold,
                                                            fontSize: 9,
                                                            letterSpacing: 0.5,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 2),
                                                  ],
                                                  Text(
                                                    anc.title,
                                                    style: const TextStyle(
                                                      color: Color(0xFF0F172A),
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 14.5,
                                                      height: 1.3,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    'By ${anc.createdByName}',
                                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            if (isAdminOrHr) ...[
                                              PopupMenuButton<String>(
                                                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                                                onSelected: (val) {
                                                  if (val == 'edit') {
                                                    _showAddAnnouncementModal(context, announcement: anc);
                                                  } else if (val == 'delete') {
                                                    _confirmDelete(context, anc.id);
                                                  }
                                                },
                                                itemBuilder: (context) => [
                                                  const PopupMenuItem(
                                                    value: 'edit',
                                                    child: Row(
                                                      children: [
                                                        Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                                                        SizedBox(width: 8),
                                                        Text('Edit Notice'),
                                                      ],
                                                    ),
                                                  ),
                                                  const PopupMenuItem(
                                                    value: 'delete',
                                                    child: Row(
                                                      children: [
                                                        Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                                                        SizedBox(width: 8),
                                                        Text('Delete Notice', style: TextStyle(color: Colors.redAccent)),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          anc.message,
                                          style: const TextStyle(color: Color(0xFF334155), fontSize: 13, height: 1.5),
                                        ),
                                        const SizedBox(height: 12),
                                        // Footer: Audience badge + Expiry badge
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: audienceColor.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                anc.targetAudience == 'All' ? '🌐 All Staff' : '🏢 ${anc.targetAudience}',
                                                style: TextStyle(color: audienceColor, fontSize: 11, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: anc.expiresAt == null
                                                    ? const Color(0xFFF1F5F9)
                                                    : const Color(0xFFFFF7ED),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(
                                                    anc.expiresAt == null ? Icons.all_inclusive_rounded : Icons.timer_outlined,
                                                    size: 12,
                                                    color: anc.expiresAt == null
                                                        ? const Color(0xFF64748B)
                                                        : const Color(0xFFD97706),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    anc.expiryLabel,
                                                    style: TextStyle(
                                                      color: anc.expiresAt == null
                                                          ? const Color(0xFF64748B)
                                                          : const Color(0xFFD97706),
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () => _showAddAnnouncementModal(context),
              backgroundColor: const Color(0xFF0284C7),
              icon: const Icon(Icons.add_comment_rounded, color: Colors.white),
              label: const Text('Post Announcement', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }
}
