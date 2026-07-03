import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../services/api_service.dart';

class StaffAttendanceScreen extends StatefulWidget {
  const StaffAttendanceScreen({super.key});

  @override
  State<StaffAttendanceScreen> createState() => _StaffAttendanceScreenState();
}

class _StaffAttendanceScreenState extends State<StaffAttendanceScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  String _selectedMonth = 'July 2026';
  String _searchQuery = '';
  List<dynamic> _staffSummaries = [];

  final List<String> _monthsList = [
    'July 2026',
    'June 2026',
    'May 2026',
    'April 2026',
    'March 2026',
    'February 2026',
    'January 2026',
    'December 2025',
    'November 2025',
    'October 2025',
    'September 2025',
    'August 2025',
  ];

  @override
  void initState() {
    super.initState();
    _fetchMonthlySummary();
  }

  Future<void> _fetchMonthlySummary() async {
    setState(() => _isLoading = true);
    try {
      final response = await _api.get('/attendance/admin/monthly-summary?month=$_selectedMonth');
      if (response.statusCode == 200) {
        setState(() {
          _staffSummaries = response.data['staffSummaries'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print('Monthly summary error: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredSummaries = _staffSummaries.where((item) {
      final empName = item['employee']?['name']?.toString().toLowerCase() ?? '';
      final empDept = item['employee']?['department']?.toString().toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase().trim();
      return empName.contains(query) || empDept.contains(query);
    }).toList();

    double totalPresent = 0;
    double totalLeaves = 0;
    double totalAbsents = 0;

    for (var item in _staffSummaries) {
      totalPresent += (item['presentDays'] as num?)?.toDouble() ?? 0;
      totalLeaves += (item['leavesTaken'] as num?)?.toDouble() ?? 0;
      totalAbsents += (item['absentDays'] as num?)?.toDouble() ?? 0;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Staff Attendance & Leave Summary',
            style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: Column(
        children: [
          // Filter Bar (Month Selector + Search)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedMonth,
                            isExpanded: true,
                            icon: const Icon(Icons.calendar_month_rounded, color: Color(0xFF2563EB)),
                            items: _monthsList.map((m) {
                              return DropdownMenuItem(
                                value: m,
                                child: Text('Month: $m',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => _selectedMonth = val);
                                _fetchMonthlySummary();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search by employee name or department...',
                    prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B)),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Overview Statistics Chips
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: _buildStatChip(
                    'Present',
                    '${totalPresent.toStringAsFixed(0)} Days',
                    const Color(0xFF10B981),
                    const Color(0x1510B981),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatChip(
                    'Leaves Taken',
                    '${totalLeaves.toStringAsFixed(0)} Days',
                    Colors.amber[800]!,
                    Colors.amber.withValues(alpha: 0.15),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatChip(
                    'Absents',
                    '${totalAbsents.toStringAsFixed(0)} Days',
                    const Color(0xFFEF4444),
                    const Color(0x15EF4444),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Employee Summaries List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredSummaries.isEmpty
                    ? Center(
                        child: Text(
                          'No attendance or leave records for $_selectedMonth.',
                          style: const TextStyle(color: Color(0xFF64748B)),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchMonthlySummary,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredSummaries.length,
                          itemBuilder: (context, index) {
                            final item = filteredSummaries[index];
                            final emp = item['employee'] ?? {};
                            final presentDays = (item['presentDays'] as num?)?.toDouble() ?? 0;
                            final leavesTaken = (item['leavesTaken'] as num?)?.toDouble() ?? 0;
                            final absentDays = (item['absentDays'] as num?)?.toDouble() ?? 0;
                            final overtimeHours = (item['overtimeHours'] as num?)?.toDouble() ?? 0;

                            return Card(
                              elevation: 2,
                              color: Colors.white,
                              shadowColor: const Color(0x100F172A),
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () => _showEmployeeDailyLogModal(context, item),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 20,
                                            backgroundColor: const Color(0xFFEFF6FF),
                                            child: Text(
                                              emp['name'] != null && emp['name'].toString().isNotEmpty
                                                  ? emp['name'].toString().substring(0, 1).toUpperCase()
                                                  : '?',
                                              style: const TextStyle(
                                                  color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  emp['name'] ?? 'Unknown Employee',
                                                  style: const TextStyle(
                                                      color: Color(0xFF0F172A),
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 15),
                                                ),
                                                Text(
                                                  'ID: ${emp['empId'] ?? 'N/A'} • Dept: ${emp['department'] ?? 'Staff'}',
                                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                      const SizedBox(height: 12),

                                      // Badges Row
                                      Row(
                                        children: [
                                          _buildBadge('Present: ${presentDays.toStringAsFixed(0)}d',
                                              const Color(0xFF10B981), const Color(0x1510B981)),
                                          const SizedBox(width: 8),
                                          _buildBadge('Leaves: ${leavesTaken.toStringAsFixed(0)}d',
                                              Colors.amber[800]!, Colors.amber.withValues(alpha: 0.15)),
                                          const SizedBox(width: 8),
                                          _buildBadge('Absents: ${absentDays.toStringAsFixed(0)}d',
                                              const Color(0xFFEF4444), const Color(0x15EF4444)),
                                          if (overtimeHours > 0) ...[
                                            const SizedBox(width: 8),
                                            _buildBadge('OT: ${overtimeHours.toStringAsFixed(1)}h',
                                                const Color(0xFF2563EB), const Color(0x152563EB)),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(String title, String val, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(val, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 2),
          Text(title, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildBadge(String text, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 11),
      ),
    );
  }

  void _showEmployeeDailyLogModal(BuildContext context, dynamic summaryItem) {
    final emp = summaryItem['employee'] ?? {};
    final dailyRecords = summaryItem['dailyRecords'] as List? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        emp['name'] ?? 'Employee Logs',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        'Monthly Log for $_selectedMonth',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: dailyRecords.isEmpty
                    ? const Center(
                        child: Text('No daily attendance entries recorded for this month.',
                            style: TextStyle(color: Color(0xFF64748B))),
                      )
                    : ListView.builder(
                        itemCount: dailyRecords.length,
                        itemBuilder: (context, index) {
                          final rec = dailyRecords[index];
                          final isPresent = ['Present', 'Late'].contains(rec['status']);
                          final isLeave = rec['status'] == 'Leave';

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            color: const Color(0xFFF8FAFC),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              title: Text(
                                rec['date'] ?? 'N/A',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              subtitle: Text(
                                'Check In: ${rec['checkIn']} • Check Out: ${rec['checkOut']}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isPresent
                                      ? const Color(0x1510B981)
                                      : isLeave
                                          ? Colors.amber.withValues(alpha: 0.15)
                                          : const Color(0x15EF4444),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  rec['status'] ?? 'N/A',
                                  style: TextStyle(
                                    color: isPresent
                                        ? const Color(0xFF10B981)
                                        : isLeave
                                            ? Colors.amber[800]
                                            : const Color(0xFFEF4444),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
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
  }
}
