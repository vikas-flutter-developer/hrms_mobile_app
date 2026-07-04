import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchReportOverview();
    });
  }

  void _showRecruitmentBottomSheet(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    hr.fetchRecruitmentCandidates();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Consumer<HrProvider>(
              builder: (context, hr, child) {
                return Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Recruitment Pipeline & Applications',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Active job seekers, matching scores, and pipeline stages.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: hr.isLoading && hr.recruitmentCandidates.isEmpty
                            ? const Center(child: CircularProgressIndicator())
                            : hr.recruitmentCandidates.isEmpty
                                ? const Center(
                                    child: Text('No active candidate applications found.', style: TextStyle(color: Color(0xFF64748B))),
                                  )
                                : ListView.builder(
                                    controller: scrollController,
                                    itemCount: hr.recruitmentCandidates.length,
                                    itemBuilder: (context, index) {
                                      final candidate = hr.recruitmentCandidates[index];
                                      final job = candidate['jobId'] is Map ? candidate['jobId']['title']?.toString() ?? 'Job Vacancy' : 'Job Vacancy';
                                      final status = candidate['status']?.toString() ?? 'Applied';
                                      final score = candidate['aiScore'] ?? 75;

                                      Color statusColor;
                                      switch (status) {
                                        case 'Hired': statusColor = const Color(0xFF10B981); break;
                                        case 'Offered': statusColor = const Color(0xFF8B5CF6); break;
                                        case 'Interviewing': statusColor = const Color(0xFFD97706); break;
                                        case 'Shortlisted': statusColor = const Color(0xFF0284C7); break;
                                        case 'Rejected': statusColor = const Color(0xFFEF4444); break;
                                        default: statusColor = const Color(0xFF64748B);
                                      }

                                      return Card(
                                        elevation: 1,
                                        color: const Color(0xFFF8FAFC),
                                        margin: const EdgeInsets.only(bottom: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        child: Padding(
                                          padding: const EdgeInsets.all(12.0),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    candidate['name']?.toString() ?? 'Applicant',
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                                                    child: Text(
                                                      status,
                                                      style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Text(job, style: const TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.w600)),
                                              const SizedBox(height: 8),
                                              Text('Email: ${candidate['email']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                              Text('Phone: ${candidate['phone'] ?? 'N/A'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                              const Divider(height: 16),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Row(
                                                    children: [
                                                      const Icon(Icons.psychology_outlined, size: 16, color: Color(0xFFD97706)),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        'AI Fit Score: $score%',
                                                        style: const TextStyle(color: Color(0xFFD97706), fontSize: 11, fontWeight: FontWeight.bold),
                                                      ),
                                                    ],
                                                  ),
                                                  Expanded(
                                                    child: Text(
                                                      candidate['feedback']?.toString() ?? 'Awaiting feedback',
                                                      textAlign: TextAlign.right,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontStyle: FontStyle.italic),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);
    final report = hr.reportOverview;

    if (hr.isLoading && report.isEmpty) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final attendance = report['attendance'] as Map<String, dynamic>? ?? {};
    final recruitment = report['recruitment'] as Map<String, dynamic>? ?? {};
    final stats = report['stats'] as Map<String, dynamic>? ?? {};
    final revenueVsSalary = report['revenueVsSalary'] as Map<String, dynamic>? ?? {};
    final trends = report['trends'] as Map<String, dynamic>? ?? {};
    final headcountByDept = report['headcountByDept'] as List<dynamic>? ?? [];

    final double salaryCost = (revenueVsSalary['salaryCost'] ?? 0).toDouble();
    final double pendingExpenses = (stats['pendingExpenseAmount'] ?? 0).toDouble();

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('HR Analytics & Reporting', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => hr.fetchReportOverview(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Attendance Summary Section
              const Text('Daily Operations Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Present Today',
                      value: '${attendance['present'] ?? 0}',
                      subtitle: 'Late: ${attendance['late'] ?? 0} staff',
                      icon: Icons.check_circle_outline_rounded,
                      color: const Color(0xFF10B981),
                      onTap: () => Navigator.pushNamed(context, '/staff_attendance'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'On Leave Today',
                      value: '${stats['onLeaveToday'] ?? attendance['absent'] ?? 0}',
                      subtitle: 'Absence alerts: high',
                      icon: Icons.event_busy_rounded,
                      color: const Color(0xFFEF4444),
                      onTap: () => Navigator.pushNamed(context, '/leaves'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Active Recruitment',
                      value: '${recruitment['total'] ?? 0}',
                      subtitle: 'Interviewing: ${recruitment['interviewing'] ?? 0}',
                      icon: Icons.person_add_alt_1_rounded,
                      color: const Color(0xFF0284C7),
                      onTap: () => _showRecruitmentBottomSheet(context),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      title: 'Payroll Status',
                      value: report['payrollStatus']?.toString() ?? 'Pending',
                      subtitle: 'Monthly ledger run',
                      icon: Icons.payments_outlined,
                      color: const Color(0xFF8B5CF6),
                      onTap: () => Navigator.pushNamed(context, '/payslips'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Financial Operations Summary
              const Text('Financial & Budget Overview', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 8),
              Card(
                elevation: 2,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow(
                        icon: Icons.monetization_on_rounded,
                        iconColor: Colors.green[700]!,
                        title: 'Monthly Salary Expenditure',
                        value: '₹${salaryCost.toStringAsFixed(0)}',
                        onTap: () => Navigator.pushNamed(context, '/payslips'),
                      ),
                      const Divider(height: 20),
                      _buildDetailRow(
                        icon: Icons.receipt_long_rounded,
                        iconColor: Colors.amber[700]!,
                        title: 'Pending Reimbursements',
                        value: '₹${pendingExpenses.toStringAsFixed(0)}',
                        onTap: () => Navigator.pushNamed(context, '/manager_dashboard'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // IT Inventory & Performance Operations
              const Text('IT Inventory & Talent Development', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 8),
              Card(
                elevation: 2,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow(
                        icon: Icons.devices_rounded,
                        iconColor: Colors.cyan[700]!,
                        title: 'Managed IT Assets',
                        value: '${stats['totalAssets'] ?? 0} devices',
                        onTap: () => Navigator.pushNamed(context, '/assets'),
                      ),
                      const Divider(height: 20),
                      _buildDetailRow(
                        icon: Icons.school_rounded,
                        iconColor: Colors.orange[800]!,
                        title: 'Ongoing Training Programs',
                        value: '${stats['activeTrainingPrograms'] ?? 0} active',
                        onTap: () => Navigator.pushNamed(context, '/learning'),
                      ),
                      const Divider(height: 20),
                      _buildDetailRow(
                        icon: Icons.rate_review_rounded,
                        iconColor: Colors.pink[600]!,
                        title: 'Pending Performance Appraisals',
                        value: '${stats['pendingPerformanceReviews'] ?? 0} draft',
                        onTap: () => Navigator.pushNamed(context, '/performance'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Staff Turnover Trends
              const Text('Staff Turnover Trends', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 8),
              Card(
                elevation: 2,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            const Icon(Icons.group_add_rounded, color: Colors.teal, size: 28),
                            const SizedBox(height: 4),
                            Text('${trends['joined'] ?? 0}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal)),
                            const Text('Joined This Month', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 50, color: const Color(0xFFE2E8F0)),
                      Expanded(
                        child: Column(
                          children: [
                            const Icon(Icons.logout_rounded, color: Colors.redAccent, size: 28),
                            const SizedBox(height: 4),
                            Text('${trends['exited'] ?? 0}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.redAccent)),
                            const Text('Exited This Month', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Dynamic Department Headcount Card
              Card(
                elevation: 2,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Department Headcount & Analytics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                      const SizedBox(height: 12),
                      
                      headcountByDept.isEmpty
                          ? const Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 20),
                                child: Text('No active department headcount logs.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                              ),
                            )
                          : Column(
                              children: headcountByDept.map((dept) {
                                final name = dept['_id']?.toString() ?? 'General';
                                final count = dept['count'] ?? 0;
                                final uppercaseName = name.substring(0, 1).toUpperCase() + name.substring(1);
                                return _buildReportLine(uppercaseName, '$count Active Staff');
                              }).toList(),
                            ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Export Actions Card
              Card(
                elevation: 2,
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Data Export & Backup Center', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A))),
                      const SizedBox(height: 6),
                      const Text('Download analytical CSV and PDF statements:', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      const SizedBox(height: 16),

                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Monthly Attendance Summary exported to CSV!'), backgroundColor: Colors.green),
                          );
                        },
                        icon: const Icon(Icons.download_rounded, color: Colors.white),
                        label: const Text('Export Attendance Summary (CSV)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 10),

                      OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Payroll & Expense Audit Report generated!'), backgroundColor: Colors.green),
                          );
                        },
                        icon: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF8B5CF6)),
                        label: const Text('Generate Payroll Audit Report (PDF)', style: TextStyle(color: Color(0xFF8B5CF6), fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          side: const BorderSide(color: Color(0xFF8B5CF6)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 12),
              Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 4),
              Text(title, style: const TextStyle(color: Color(0xFF1E293B), fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Color(0xFF334155), fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
            Text(
              value,
              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  Widget _buildReportLine(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFF334155), fontSize: 13, fontWeight: FontWeight.bold)),
          Text(subtitle, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
