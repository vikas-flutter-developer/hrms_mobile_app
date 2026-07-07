import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';

class LoansScreen extends StatefulWidget {
  const LoansScreen({super.key});

  @override
  State<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends State<LoansScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  final _emiCtrl = TextEditingController();
  String? _selectedEmployeeId;
  String _requestType = 'Loan'; // 'Loan' or 'Petty Cash'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      hr.fetchMyLoans();
      if (auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr') {
        hr.fetchMyTeam();
      }
    });
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    _emiCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit({required bool isAdminOrHr}) async {
    if (!_formKey.currentState!.validate()) return;

    final hr = Provider.of<HrProvider>(context, listen: false);
    final amount = double.parse(_amountCtrl.text);
    final reason = '[${_requestType.toUpperCase()}] ' + _reasonCtrl.text.trim();
    final emi = _requestType == 'Petty Cash' ? 0.0 : double.parse(_emiCtrl.text);

    final success = await hr.applyLoan(
      amount,
      reason,
      emi,
      employeeId: isAdminOrHr ? _selectedEmployeeId : null,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isAdminOrHr 
              ? '${_requestType} issued to staff employee!' 
              : '${_requestType} request submitted successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      _amountCtrl.clear();
      _reasonCtrl.clear();
      _emiCtrl.clear();
      _selectedEmployeeId = null;
      _requestType = 'Loan';
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(hr.errorMessage ?? 'Failed to process request.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showRequestModal(BuildContext context, {required bool isAdminOrHr}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    if (isAdminOrHr && hr.myTeam.isNotEmpty && _selectedEmployeeId == null) {
      _selectedEmployeeId = hr.myTeam.first.id;
    }

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
                      Text(
                        isAdminOrHr ? 'Issue Staff Salary Advance / Loan' : 'Request Salary Advance / Loan',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isAdminOrHr
                            ? 'Select staff employee to issue salary advance or loan disbursement:'
                            : 'Submit a formal request for salary advance or personal loan:',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),

                      // Request Type Selector
                      Row(
                        children: [
                          Expanded(
                            child: RadioListTile<String>(
                              title: const Text('Salary Loan', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              value: 'Loan',
                              groupValue: _requestType,
                              activeColor: const Color(0xFF2563EB),
                              contentPadding: EdgeInsets.zero,
                              onChanged: (val) {
                                if (val != null) {
                                  setModalState(() => _requestType = val);
                                }
                              },
                            ),
                          ),
                          Expanded(
                            child: RadioListTile<String>(
                              title: const Text('Petty Cash', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              value: 'Petty Cash',
                              groupValue: _requestType,
                              activeColor: const Color(0xFF2563EB),
                              contentPadding: EdgeInsets.zero,
                              onChanged: (val) {
                                if (val != null) {
                                  setModalState(() => _requestType = val);
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // If Admin/HR, show staff employee dropdown
                      if (isAdminOrHr) ...[
                        DropdownButtonFormField<String>(
                          value: _selectedEmployeeId,
                          decoration: InputDecoration(
                            labelText: 'Select Staff Employee',
                            labelStyle: const TextStyle(color: Color(0xFF64748B)),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                          items: hr.myTeam.map((emp) {
                            return DropdownMenuItem<String>(
                              value: emp.id,
                              child: Text('${emp.name} (${emp.department})'),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => _selectedEmployeeId = val);
                          },
                          validator: (val) => val == null ? 'Please select employee' : null,
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Amount
                      TextFormField(
                        controller: _amountCtrl,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: _requestType == 'Petty Cash' ? 'Petty Cash Amount (INR)' : 'Disbursed Amount (INR)',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        validator: (value) => value == null || double.tryParse(value) == null ? 'Enter valid amount' : null,
                      ),
                      const SizedBox(height: 16),

                      // Monthly EMI deduction (only show if requestType is Loan)
                      if (_requestType == 'Loan') ...[
                        TextFormField(
                          controller: _emiCtrl,
                          style: const TextStyle(color: Color(0xFF0F172A)),
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Monthly EMI Deduction (INR)',
                            labelStyle: const TextStyle(color: Color(0xFF64748B)),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                          validator: (value) => value == null || double.tryParse(value) == null ? 'Enter valid EMI amount' : null,
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Reason
                      TextFormField(
                        controller: _reasonCtrl,
                        maxLines: 3,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Reason Statement / Remarks',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Enter reason' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () => _submit(isAdminOrHr: isAdminOrHr),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          isAdminOrHr ? 'Issue Staff Advance' : 'Submit Request',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
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
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: Text(
          isAdminOrHr ? 'Staff Loans & Advances' : 'Advances & Loans',
          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.isLoading && hr.myLoans.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : hr.myLoans.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.monetization_on_outlined, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      Text(
                        isAdminOrHr ? 'No staff advance loans requested.' : 'No advance loans requested.',
                        style: const TextStyle(color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: hr.myLoans.length,
                  itemBuilder: (context, index) {
                    final req = hr.myLoans[index];
                    final isPending = req.status.toLowerCase() == 'pending';
                    final hasEmployeeName = req.employeeName.isNotEmpty && req.employeeName != 'Unknown';

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
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        hasEmployeeName
                                            ? req.employeeName
                                            : 'Request ID: ${req.id.length > 6 ? req.id.substring(0, 6) : req.id}',
                                        style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                      if (hasEmployeeName)
                                        Text(
                                          'ID: ${req.employeeEmpId} • Request: ${req.id.length > 6 ? req.id.substring(0, 6) : req.id}',
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                        ),
                                    ],
                                  ),
                                ),
                                _buildStatusBadge(req.status),
                              ],
                            ),
                            const SizedBox(height: 12),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildMetaCell(req.emiAmount == 0.0 ? 'Amount' : 'Principal', '₹ ${req.amount.toStringAsFixed(0)}'),
                                _buildMetaCell(req.emiAmount == 0.0 ? 'Type' : 'Monthly EMI', req.emiAmount == 0.0 ? 'Petty Cash' : '₹ ${req.emiAmount.toStringAsFixed(0)}'),
                                _buildMetaCell('Remaining Balance', '₹ ${req.balanceRemaining.toStringAsFixed(0)}'),
                              ],
                            ),

                            const Divider(color: Color(0xFFE2E8F0), height: 24),

                            Text(
                              'Reason: ${req.reason}',
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                            ),

                            // If Admin/HR and status is Pending, show Approve/Reject Action Buttons
                            if (isAdminOrHr && isPending) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () async {
                                        final success = await hr.resolveLoanStatus(req.id, 'Approved');
                                        if (context.mounted && success) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Loan request approved!'), backgroundColor: Colors.green),
                                          );
                                        }
                                      },
                                      icon: const Icon(Icons.check_circle_rounded, size: 16, color: Colors.white),
                                      label: const Text('Approve', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF10B981),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () async {
                                        final success = await hr.resolveLoanStatus(req.id, 'Rejected');
                                        if (context.mounted && success) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Loan request rejected!'), backgroundColor: Colors.redAccent),
                                          );
                                        }
                                      },
                                      icon: const Icon(Icons.cancel_rounded, size: 16, color: Colors.white),
                                      label: const Text('Reject', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFEF4444),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showRequestModal(context, isAdminOrHr: isAdminOrHr),
        backgroundColor: const Color(0xFF2563EB),
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(
          isAdminOrHr ? 'Issue Staff Advance' : 'Request Loan',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildMetaCell(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'approved':
        color = const Color(0xFF10B981);
        break;
      case 'rejected':
        color = const Color(0xFFEF4444);
        break;
      case 'pending':
        color = Colors.amber;
        break;
      case 'closed':
        color = Colors.blueGrey;
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
