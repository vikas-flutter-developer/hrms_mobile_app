import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/payroll.dart';

class PayslipsScreen extends StatefulWidget {
  const PayslipsScreen({super.key});

  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr') {
        hr.fetchStaffPayslips();
        hr.fetchMyTeam();
      } else {
        hr.fetchMyPayslips();
      }
    });
  }

  Future<void> _exportPayslipPDF(Payslip payslip) async {
    // Generate a beautiful payslip PDF on the fly using Syncfusion PDF
    final document = PdfDocument();
    final page = document.pages.add();
    final g = page.graphics;

    final titleFont = PdfStandardFont(PdfFontFamily.helvetica, 18, style: PdfFontStyle.bold);
    final sectionFont = PdfStandardFont(PdfFontFamily.helvetica, 12, style: PdfFontStyle.bold);
    final standardFont = PdfStandardFont(PdfFontFamily.helvetica, 10);

    // Write title
    g.drawString('CORPORATE PAYSLIP', titleFont, bounds: const Rect.fromLTWH(0, 0, 500, 30));
    g.drawString('Month: ${payslip.month}', standardFont, bounds: const Rect.fromLTWH(0, 30, 200, 20));
    g.drawString('Status: ${payslip.status}', standardFont, bounds: const Rect.fromLTWH(0, 45, 200, 20));
    
    // Draw divider line
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1), const Offset(0, 65), const Offset(500, 65));

    // Earnings Section
    g.drawString('EARNINGS', sectionFont, bounds: const Rect.fromLTWH(0, 80, 200, 20));
    
    double y = 105;
    final earnings = {
      'Basic Pay': payslip.basicPay,
      'House Rent Allowance (HRA)': payslip.hra,
      'Special Allowance': payslip.specialAllowance,
      'Overtime Pay': payslip.overtimePay,
      'Incentives': payslip.incentives,
      'Bonus': payslip.bonus,
      'Gratuity': payslip.gratuity,
    };

    earnings.forEach((key, val) {
      if (val > 0) {
        g.drawString(key, standardFont, bounds: Rect.fromLTWH(20, y, 250, 20));
        g.drawString('INR ${val.toStringAsFixed(2)}', standardFont, bounds: Rect.fromLTWH(300, y, 150, 20));
        y += 20;
      }
    });

    // Deductions Section
    g.drawLine(PdfPen(PdfColor(226, 232, 240), width: 0.5), Offset(0, y + 10), Offset(500, y + 10));
    y += 25;
    g.drawString('DEDUCTIONS', sectionFont, bounds: Rect.fromLTWH(0, y, 200, 20));
    y += 25;

    final deductions = {
      'Provident Fund (PF)': payslip.pfDeduction,
      'ESI Health Ins.': payslip.esiDeduction,
      'Professional Tax (PT)': payslip.professionalTax,
      'TDS Tax Deducted': payslip.tds,
      'Loss of Pay (LOP) Days': payslip.lopDeduction,
      'EMI Advance Loan': payslip.loanEmi,
    };

    deductions.forEach((key, val) {
      if (val > 0) {
        g.drawString(key, standardFont, bounds: Rect.fromLTWH(20, y, 250, 20));
        g.drawString('INR ${val.toStringAsFixed(2)}', standardFont, bounds: Rect.fromLTWH(300, y, 150, 20));
        y += 20;
      }
    });

    // Summary Section
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1.5), Offset(0, y + 10), Offset(500, y + 10));
    y += 25;

    g.drawString('NET TAKE HOME PAY', sectionFont, bounds: Rect.fromLTWH(0, y, 200, 20));
    g.drawString('INR ${payslip.netPay.toStringAsFixed(2)}', sectionFont, bounds: Rect.fromLTWH(300, y, 150, 20));

    // Save and Share
    final bytes = await document.save();
    document.dispose();

    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/payslip_${payslip.month.replaceAll(' ', '_')}.pdf');
    await file.writeAsBytes(bytes);

    final xFile = XFile(file.path);
    await Share.shareXFiles([xFile], text: 'My Payslip for ${payslip.month}');
  }

  void _showDetails(Payslip payslip) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Payslip: ${payslip.month}',
                    style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.share_rounded, color: Color(0xFF2563EB)),
                    onPressed: () {
                      Navigator.pop(context);
                      _exportPayslipPDF(payslip);
                    },
                  ),
                ],
              ),
              const Divider(color: Color(0xFFE2E8F0)),
              const SizedBox(height: 12),
              
              const Text('EARNINGS', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              _buildRow('Basic Pay', payslip.basicPay),
              _buildRow('HRA', payslip.hra),
              _buildRow('Special Allowance', payslip.specialAllowance),
              if (payslip.overtimePay > 0) _buildRow('Overtime Pay', payslip.overtimePay),
              if (payslip.bonus > 0) _buildRow('Bonus', payslip.bonus),
              if (payslip.gratuity > 0) _buildRow('Gratuity', payslip.gratuity),
              
              const SizedBox(height: 16),
              const Text('DEDUCTIONS', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              if (payslip.pfDeduction > 0) _buildRow('Provident Fund (PF)', payslip.pfDeduction),
              if (payslip.esiDeduction > 0) _buildRow('ESI Health', payslip.esiDeduction),
              if (payslip.professionalTax > 0) _buildRow('Professional Tax (PT)', payslip.professionalTax),
              if (payslip.tds > 0) _buildRow('TDS Tax', payslip.tds),
              if (payslip.lopDeduction > 0) _buildRow('Loss of Pay (LOP)', payslip.lopDeduction),
              if (payslip.loanEmi > 0) _buildRow('EMI Loan repayment', payslip.loanEmi),

              const Divider(color: Color(0xFFE2E8F0), height: 32),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'NET TAKE HOME',
                    style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '₹ ${payslip.netPay.toStringAsFixed(0)}',
                    style: const TextStyle(color: Color(0xFF10B981), fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRow(String title, double val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
          Text('₹ ${val.toStringAsFixed(1)}', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';
    final payslips = isAdminOrHr ? hr.staffPayslips : hr.myPayslips;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: Text(
          isAdminOrHr ? 'Staff Payroll Hub' : 'My Payslips',
          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        actions: [
          if (isAdminOrHr)
            IconButton(
              icon: const Icon(Icons.playlist_add_rounded, color: Color(0xFF2563EB)),
              tooltip: 'Run Monthly Payroll',
              onPressed: () => _showRunPayrollModal(context),
            ),
        ],
      ),
      body: hr.isLoading && payslips.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : payslips.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      Text(
                        isAdminOrHr ? 'No staff payroll processed yet.' : 'No payslip files processed yet.',
                        style: const TextStyle(color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: payslips.length,
                  itemBuilder: (context, index) {
                    final slip = payslips[index];
                    final isPaid = slip.status.toLowerCase() == 'paid';
                    final titleText = isAdminOrHr && slip.employeeName != null
                        ? '${slip.employeeName} (${slip.month})'
                        : slip.month;

                    return Card(
                      elevation: 2,
                      color: Colors.white,
                      shadowColor: const Color(0x100F172A),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
                          child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFEF4444)),
                        ),
                        title: Text(
                          titleText,
                          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            if (isAdminOrHr && slip.employeeEmpId != null)
                              Text('ID: ${slip.employeeEmpId} • Dept: ${slip.employeeDepartment ?? "Staff"}',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            const SizedBox(height: 2),
                            Text(
                              'Net pay: ₹ ${slip.netPay.toStringAsFixed(0)}',
                              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: (isPaid ? const Color(0xFF10B981) : Colors.amber).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                slip.status,
                                style: TextStyle(
                                  color: isPaid ? const Color(0xFF10B981) : Colors.amber[800],
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF64748B), size: 14),
                          ],
                        ),
                        onTap: () => _showDetails(slip),
                      ),
                    );
                  },
                ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () => _showCreatePayrollOptions(context),
              backgroundColor: const Color(0xFF2563EB),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Create Payroll', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  void _showCreatePayrollOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create New Payroll',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              const Text('Select how you want to process payroll for staff:',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              const SizedBox(height: 20),

              // Option 1: Run Monthly Staff Payroll
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                  child: const Icon(Icons.playlist_add_check_rounded, color: Color(0xFF2563EB)),
                ),
                title: const Text('Run Monthly Staff Payroll', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Auto-calculate salary for all active employees for a month.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                onTap: () {
                  Navigator.pop(context);
                  _showRunPayrollModal(context);
                },
              ),
              const SizedBox(height: 12),

              // Option 2: Create Custom Individual Payslip
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(color: Color(0xFFECFDF5), shape: BoxShape.circle),
                  child: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xFF10B981)),
                ),
                title: const Text('Create Individual Payslip', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Enter custom salary, bonus, and tax figures for a single employee.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                onTap: () {
                  Navigator.pop(context);
                  _showCreateIndividualPayslipModal(context);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  void _showCreateIndividualPayslipModal(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    String? selectedEmpId = hr.myTeam.isNotEmpty ? hr.myTeam.first.id : null;
    final monthCtrl = TextEditingController(text: 'July 2026');
    final basicCtrl = TextEditingController(text: '35000');
    final hraCtrl = TextEditingController(text: '15000');
    final allowanceCtrl = TextEditingController(text: '10000');
    final bonusCtrl = TextEditingController(text: '2500');
    final pfCtrl = TextEditingController(text: '3000');
    final tdsCtrl = TextEditingController(text: '1000');
    final formKey = GlobalKey<FormState>();

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
                        'Create Individual Payslip',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Select Employee
                      DropdownButtonFormField<String>(
                        initialValue: selectedEmpId,
                        decoration: InputDecoration(
                          labelText: 'Select Employee',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: hr.myTeam.map((emp) {
                          return DropdownMenuItem(
                            value: emp.id,
                            child: Text('${emp.name} (${emp.department})'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedEmpId = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Month
                      TextFormField(
                        controller: monthCtrl,
                        decoration: InputDecoration(
                          labelText: 'Payroll Month (e.g. July 2026)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Earnings Row
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: basicCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Basic Pay (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: hraCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'HRA (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: allowanceCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Special Allowance (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: bonusCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Bonus / Incentives (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Deductions Row
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: pfCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'PF Deduction (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: tdsCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'TDS Tax (₹)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (selectedEmpId == null) return;
                          final basic = double.tryParse(basicCtrl.text) ?? 0;
                          final hra = double.tryParse(hraCtrl.text) ?? 0;
                          final allowance = double.tryParse(allowanceCtrl.text) ?? 0;
                          final bonus = double.tryParse(bonusCtrl.text) ?? 0;
                          final pf = double.tryParse(pfCtrl.text) ?? 0;
                          final tds = double.tryParse(tdsCtrl.text) ?? 0;

                          final success = await hr.createManualPayslip(
                            employeeId: selectedEmpId!,
                            month: monthCtrl.text.trim(),
                            basicPay: basic,
                            hra: hra,
                            specialAllowance: allowance,
                            bonus: bonus,
                            pfDeduction: pf,
                            tds: tds,
                          );

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Individual Payslip created successfully!' : 'Failed to create payslip.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Issue Payslip', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showRunPayrollModal(BuildContext context) {
    String selectedMonth = 'July 2026';
    final monthsList = ['June 2026', 'July 2026', 'August 2026', 'September 2026'];

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              title: const Text('Run Monthly Payroll'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Select target month to calculate and issue payslips for all staff members:',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: selectedMonth,
                    decoration: InputDecoration(
                      labelText: 'Target Month',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: monthsList.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedMonth = val);
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    final hr = Provider.of<HrProvider>(context, listen: false);
                    final success = await hr.runMonthlyPayroll(selectedMonth);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Payroll for $selectedMonth generated!' : 'Failed to run payroll or already generated.'),
                          backgroundColor: success ? Colors.green : Colors.redAccent,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
                  child: const Text('Run Payroll'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
