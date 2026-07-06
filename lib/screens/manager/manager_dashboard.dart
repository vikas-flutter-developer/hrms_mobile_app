import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/manager_provider.dart';

class ManagerDashboard extends StatefulWidget {
  const ManagerDashboard({super.key});

  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final manager = Provider.of<ManagerProvider>(context, listen: false);
      manager.fetchPendingLeaves();
      manager.fetchPendingRegularizations();
      manager.fetchPendingExpenses();
      manager.fetchPendingLoans();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final manager = Provider.of<ManagerProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Approvals Panel', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFF43F5E), // Rose 500
          unselectedLabelColor: const Color(0xFF64748B), // Slate 500
          indicatorColor: const Color(0xFFF43F5E),
          isScrollable: true,
          tabs: const [
            Tab(text: 'Leaves'),
            Tab(text: 'Clock Adjustments'),
            Tab(text: 'Expenses'),
            Tab(text: 'Salary Advances'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Leaves
          _buildLeavesApprovals(manager),
 
          // Tab 2: Regularizations
          _buildRegularizationsApprovals(manager),
 
          // Tab 3: Expenses
          _buildExpensesApprovals(manager),
 
          // Tab 4: Loans
          _buildLoansApprovals(manager),
        ],
      ),
    );
  }
 
  // --- LEAVE APPROVALS TAB ---
 
  Widget _buildLeavesApprovals(ManagerProvider manager) {
    final list = manager.pendingLeaves;
    if (manager.isLoading) return const Center(child: CircularProgressIndicator());
    if (list.isEmpty) return const Center(child: Text('No pending leave requests.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500)));
 
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final req = list[index];
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      req.employeeName,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      'ID: ${req.employeeEmpId}',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '${req.type.toString().toLowerCase().endsWith('leave') ? req.type : '${req.type} Leave'} (${req.days} days)',
                  style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  'Timeline: ${req.startDate} to ${req.endDate}',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                const SizedBox(height: 6),
                Text(
                  'Reason: ${req.reason}',
                  style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 24),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _handleLeaveAction(manager, req.id, 'Rejected'),
                      child: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => _handleLeaveAction(manager, req.id, 'Approved'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
 
  Future<void> _handleLeaveAction(ManagerProvider manager, String id, String action) async {
    final success = await manager.resolveLeave(id, action);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Leave request status resolved!' : 'Failed to resolve request.'),
        backgroundColor: success ? Colors.green : Colors.redAccent,
      ),
    );
  }
 
  // --- REGULARIZATION APPROVALS TAB ---
 
  Widget _buildRegularizationsApprovals(ManagerProvider manager) {
    final list = manager.pendingRegularizations;
    if (manager.isLoading) return const Center(child: CircularProgressIndicator());
    if (list.isEmpty) return const Center(child: Text('No pending clock corrections.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500)));
 
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final reg = list[index];
        final noteController = TextEditingController();
 
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
                Text(
                  reg.employeeName,
                  style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  'Date: ${_formatDate(reg.date)} • Requested status: ${reg.requestedStatus}',
                  style: const TextStyle(color: Color(0xFF2563EB), fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Reason: ${reg.reason}',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                const SizedBox(height: 12),
                
                // Review note input
                TextField(
                  controller: noteController,
                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Add review note...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 24),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _handleRegularizeAction(manager, reg.id, 'Rejected', noteController.text),
                      child: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => _handleRegularizeAction(manager, reg.id, 'Approved', noteController.text),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
 
  Future<void> _handleRegularizeAction(ManagerProvider manager, String id, String status, String note) async {
    final success = await manager.resolveRegularization(id, status, note);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Attendance adjustment resolved!' : 'Failed to resolve request.'),
        backgroundColor: success ? Colors.green : Colors.redAccent,
      ),
    );
  }
 
  // --- EXPENSE APPROVALS TAB ---
 
  Widget _buildExpensesApprovals(ManagerProvider manager) {
    final list = manager.pendingExpenses;
    if (manager.isLoading) return const Center(child: CircularProgressIndicator());
    if (list.isEmpty) return const Center(child: Text('No pending expense claims.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500)));
 
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final exp = list[index];
        final id = exp['_id']?.toString() ?? '';
        final empName = exp['employeeId']?['name']?.toString() ?? 'Staff';
 
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
                Text(
                  empName,
                  style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 6),
                Text(
                  '${exp['category']} Claim • ₹ ${exp['amount']}',
                  style: const TextStyle(color: Color(0xFF2563EB), fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Description: ${exp['description']}',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 24),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _handleExpenseAction(manager, id, 'Rejected'),
                      child: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => _handleExpenseAction(manager, id, 'Approved'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
 
  Future<void> _handleExpenseAction(ManagerProvider manager, String id, String status) async {
    final success = await manager.resolveExpense(id, status);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Expense claim resolved!' : 'Failed to resolve claim.'),
        backgroundColor: success ? Colors.green : Colors.redAccent,
      ),
    );
  }
 
  // --- LOAN APPROVALS TAB ---
 
  Widget _buildLoansApprovals(ManagerProvider manager) {
    final list = manager.pendingLoans;
    if (manager.isLoading) return const Center(child: CircularProgressIndicator());
    if (list.isEmpty) return const Center(child: Text('No pending salary advances.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500)));
 
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final req = list[index];
 
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
                Text(
                  req.employeeName,
                  style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 6),
                Text(
                  'Principal Advance: ₹ ${req.amount.toStringAsFixed(0)}',
                  style: const TextStyle(color: Color(0xFF2563EB), fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Preferred EMI Deduction: ₹ ${req.emiAmount.toStringAsFixed(0)} / mo',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                Text(
                  'Reason: ${req.reason}',
                  style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
                const Divider(color: Color(0xFFE2E8F0), height: 24),
                
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _handleLoanAction(manager, req.id, 'Rejected'),
                      child: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => _handleLoanAction(manager, req.id, 'Approved'),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleLoanAction(ManagerProvider manager, String id, String status) async {
    final success = await manager.resolveLoan(id, status);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Salary advance request resolved!' : 'Failed to resolve request.'),
        backgroundColor: success ? Colors.green : Colors.redAccent,
      ),
    );
  }

  String _formatDate(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return 'N/A';
    try {
      final dt = DateTime.parse(rawDate);
      final year = dt.year;
      final month = dt.month.toString().padLeft(2, '0');
      final day = dt.day.toString().padLeft(2, '0');
      return '$year-$month-$day';
    } catch (_) {
      if (rawDate.contains('T')) {
        return rawDate.split('T')[0];
      }
      return rawDate;
    }
  }
}
