import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/hr_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchNotifications();
      hr.fetchAttendanceStatus();
      hr.fetchMyTeam();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final hr = Provider.of<HrProvider>(context);
    final user = auth.currentUser;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text(
          'HRMS Core',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFF0F172A)),
            onPressed: () async {
              await auth.logout();
              if (context.mounted) {
                Navigator.pushReplacementNamed(context, '/login');
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await hr.fetchNotifications();
          await hr.fetchAttendanceStatus();
          await hr.fetchMyTeam();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Greeting Profile Banner
              _buildGreetingBanner(user),
              const SizedBox(height: 20),

              // Attendance Clocking Summary Card (Only for non-admin employees)
              if (!user.isAdmin) ...[
                _buildAttendanceClockCard(hr),
                const SizedBox(height: 20),
              ],

              // Announcements Carousel Widget
              _buildAnnouncements(hr),
              const SizedBox(height: 20),

              // Role-based Manager Entry Panel
              if (user.isManagerRole) ...[
                _buildManagerPanelButton(context),
                const SizedBox(height: 20),
              ],

              // Quick Actions Grid Title
              const Text(
                'Operational Workspaces',
                style: TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              // Operations Workspace Grid
              _buildQuickActionsGrid(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreetingBanner(dynamic user) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)], // Vibrant Blue
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white24,
            child: Text(
              user.name.substring(0, 1).toUpperCase(),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hello, ${user.name}!',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  '${user.positionLevel ?? 'Professional'} • ${user.department ?? 'General'}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFFBFDBFE)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceClockCard(HrProvider hr) {
    return Card(
      elevation: 2,
      color: Colors.white,
      shadowColor: const Color(0x100F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Daily Shift Status',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
                const SizedBox(height: 6),
                Text(
                  hr.isCheckedIn ? 'Checked In' : 'Checked Out',
                  style: TextStyle(
                    color: hr.isCheckedIn ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/clock');
              },
              icon: Icon(
                hr.isCheckedIn ? Icons.exit_to_app_rounded : Icons.play_arrow_rounded,
                color: Colors.white,
              ),
              label: Text(hr.isCheckedIn ? 'Clock Out' : 'Clock In'),
              style: ElevatedButton.styleFrom(
                backgroundColor: hr.isCheckedIn ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnnouncements(HrProvider hr) {
    final list = hr.notifications;
    if (list.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Announcements & Updates',
          style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: list.length,
            itemBuilder: (context, index) {
              final item = list[index];
              return Container(
                width: MediaQuery.of(context).size.width * 0.8,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['title'] ?? 'Notice',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item['message'] ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildManagerPanelButton(BuildContext context) {
    return InkWell(
      onTap: () {
        Navigator.pushNamed(context, '/manager_dashboard');
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFEEF2FF), // Indigo 50
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFC7D2FE)), // Indigo 200
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFE0E7FF), // Indigo 100
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.admin_panel_settings_rounded, color: Color(0xFF4F46E5)),
            ),
            const SizedBox(width: 16),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Manager Approval Console',
                    style: TextStyle(color: Color(0xFF1E1B4B), fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Resolve pending leaves, timesheets & reviews',
                    style: TextStyle(color: Color(0xFF4F46E5), fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF4F46E5), size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionsGrid(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    final actions = [
      if (isAdminOrHr)
        _ActionItem(Icons.how_to_reg_rounded, 'Staff Attendance', '/staff_attendance', Colors.indigo[600]!),
      _ActionItem(Icons.campaign_rounded, 'Notice Board', '/announcements', Colors.amber[800]!),
      _ActionItem(Icons.account_tree_rounded, 'Projects', '/projects', Colors.blue[700]!),
      _ActionItem(Icons.celebration_rounded, 'Events', '/events', Colors.pink[600]!),
      if (isAdminOrHr)
        _ActionItem(Icons.bar_chart_rounded, 'HR Reports', '/reports', Colors.deepPurple),
      _ActionItem(Icons.calendar_today_rounded, 'Leave Portal', '/leaves', Colors.purple),
      _ActionItem(Icons.receipt_long_rounded, 'Payslip Hub', '/payslips', Colors.amber[800]!),
      _ActionItem(Icons.monetization_on_rounded, 'Loan Tracker', '/loans', Colors.green[700]!),
      _ActionItem(Icons.camera_alt_rounded, 'Claim Expense', '/expenses', Colors.red[700]!),
      _ActionItem(Icons.devices_rounded, 'Asset Log', '/assets', Colors.cyan[700]!),
      _ActionItem(Icons.support_agent_rounded, 'Helpdesk Support', '/helpdesk', Colors.orange[800]!),
      _ActionItem(Icons.school_rounded, 'Training Hub', '/learning', Colors.orange[800]!),
      _ActionItem(Icons.rate_review_rounded, 'Appraisals', '/performance', Colors.pink[600]!),
      _ActionItem(Icons.group_rounded, 'Directory', '/directory', Colors.teal[700]!),
      _ActionItem(Icons.chat_bubble_rounded, 'Live Chat', '/chat', Colors.blue[700]!),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 12,
        mainAxisSpacing: 16,
        childAspectRatio: 0.8,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return InkWell(
          onTap: () {
            Navigator.pushNamed(context, action.route);
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x050F172A),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Icon(action.icon, color: action.color),
              ),
              const SizedBox(height: 8),
              Text(
                action.title,
                textAlign: TextAlign.center,
                maxLines: 2,
                style: const TextStyle(
                  color: Color(0xFF334155),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String title;
  final String route;
  final Color color;

  _ActionItem(this.icon, this.title, this.route, this.color);
}
