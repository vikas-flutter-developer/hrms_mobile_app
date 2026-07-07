import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:url_launcher/url_launcher.dart';
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

  double _calculateYTDEarnings(Payslip targetSlip, List<Payslip> allSlips) {
    final parts = targetSlip.month.split(' ');
    if (parts.length != 2) return targetSlip.netPay;
    final targetMonthName = parts[0];
    final targetYear = int.tryParse(parts[1]) ?? 0;
    if (targetYear == 0) return targetSlip.netPay;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final targetMonthIndex = monthNames.indexOf(targetMonthName);
    if (targetMonthIndex == -1) return targetSlip.netPay;

    double ytdSum = 0;
    for (final slip in allSlips) {
      final sParts = slip.month.split(' ');
      if (sParts.length != 2) continue;
      final sMonthName = sParts[0];
      final sYear = int.tryParse(sParts[1]) ?? 0;
      if (sYear != targetYear) continue;

      final sMonthIndex = monthNames.indexOf(sMonthName);
      if (sMonthIndex == -1) continue;

      if (sMonthIndex <= targetMonthIndex) {
        ytdSum += slip.netPay;
      }
    }
    return ytdSum;
  }

  // ==========================================
  // 📄 CORPORATE PDF PAYSLIP GENERATOR
  // ==========================================
  Future<File> _generatePayslipPDFFile(Payslip payslip) async {
    final document = PdfDocument();
    final page = document.pages.add();
    final g = page.graphics;

    final headerFont = PdfStandardFont(PdfFontFamily.helvetica, 18, style: PdfFontStyle.bold);
    final subHeaderFont = PdfStandardFont(PdfFontFamily.helvetica, 11, style: PdfFontStyle.bold);
    final sectionFont = PdfStandardFont(PdfFontFamily.helvetica, 12, style: PdfFontStyle.bold);
    final tableHeaderFont = PdfStandardFont(PdfFontFamily.helvetica, 10, style: PdfFontStyle.bold);
    final standardFont = PdfStandardFont(PdfFontFamily.helvetica, 10);
    final boldFont = PdfStandardFont(PdfFontFamily.helvetica, 10, style: PdfFontStyle.bold);

    // 1. Top Banner Box
    g.drawRectangle(
      brush: PdfSolidBrush(PdfColor(15, 23, 42)), // Slate 900
      bounds: const Rect.fromLTWH(0, 0, 500, 55),
    );
    g.drawString(
      'ENTERPRISE HRMS',
      headerFont,
      brush: PdfBrushes.white,
      bounds: const Rect.fromLTWH(15, 12, 350, 25),
    );
    g.drawString(
      'CONFIDENTIAL SALARY PAYSLIP STATEMENT',
      subHeaderFont,
      brush: PdfSolidBrush(PdfColor(148, 163, 184)),
      bounds: const Rect.fromLTWH(15, 33, 350, 18),
    );

    // 2. Employee Details Card Header
    double y = 70;
    g.drawRectangle(
      pen: PdfPen(PdfColor(226, 232, 240), width: 1),
      brush: PdfSolidBrush(PdfColor(248, 250, 252)),
      bounds: Rect.fromLTWH(0, y, 500, 65),
    );

    g.drawString('EMPLOYEE DETAILS', subHeaderFont, brush: PdfSolidBrush(PdfColor(37, 99, 235)), bounds: Rect.fromLTWH(12, y + 8, 200, 16));
    g.drawString('Employee Name: ${payslip.employeeName ?? "Staff Member"}', boldFont, bounds: Rect.fromLTWH(12, y + 26, 230, 16));
    g.drawString('Employee ID: ${payslip.employeeEmpId ?? "EMP-DEFAULT"}', standardFont, bounds: Rect.fromLTWH(12, y + 42, 230, 16));

    g.drawString('PAY STATEMENT INFO', subHeaderFont, brush: PdfSolidBrush(PdfColor(37, 99, 235)), bounds: Rect.fromLTWH(260, y + 8, 200, 16));
    g.drawString('Pay Period: ${payslip.month}', boldFont, bounds: Rect.fromLTWH(260, y + 26, 230, 16));
    g.drawString('Department: ${payslip.employeeDepartment ?? "General"}', standardFont, bounds: Rect.fromLTWH(260, y + 42, 230, 16));

    y += 80;

    // 3. EARNINGS & DEDUCTIONS Side-by-side Tables Header
    // Left Table: EARNINGS (Width: 240)
    g.drawRectangle(brush: PdfSolidBrush(PdfColor(37, 99, 235)), bounds: Rect.fromLTWH(0, y, 240, 22));
    g.drawString('EARNINGS', tableHeaderFont, brush: PdfBrushes.white, bounds: Rect.fromLTWH(10, y + 4, 150, 16));
    g.drawString('AMOUNT (INR)', tableHeaderFont, brush: PdfBrushes.white, bounds: Rect.fromLTWH(150, y + 4, 85, 16));

    // Right Table: DEDUCTIONS (Width: 240, X: 260)
    g.drawRectangle(brush: PdfSolidBrush(PdfColor(239, 68, 68)), bounds: Rect.fromLTWH(260, y, 240, 22));
    g.drawString('DEDUCTIONS', tableHeaderFont, brush: PdfBrushes.white, bounds: Rect.fromLTWH(270, y + 4, 150, 16));
    g.drawString('AMOUNT (INR)', tableHeaderFont, brush: PdfBrushes.white, bounds: Rect.fromLTWH(410, y + 4, 85, 16));

    y += 26;

    final earnings = [
      {'name': 'Basic Salary', 'val': payslip.basicPay},
      {'name': 'House Rent Allowance (HRA)', 'val': payslip.hra},
      {'name': 'Special Allowance', 'val': payslip.specialAllowance},
      if (payslip.overtimePay > 0) {'name': 'Overtime Pay', 'val': payslip.overtimePay},
      if (payslip.incentives > 0) {'name': 'Incentives', 'val': payslip.incentives},
      if (payslip.bonus > 0) {'name': 'Performance Bonus', 'val': payslip.bonus},
      if (payslip.gratuity > 0) {'name': 'Gratuity Pay', 'val': payslip.gratuity},
    ];

    final deductions = [
      if (payslip.pfDeduction > 0) {'name': 'Provident Fund (PF)', 'val': payslip.pfDeduction},
      if (payslip.esiDeduction > 0) {'name': 'ESI Insurance', 'val': payslip.esiDeduction},
      if (payslip.professionalTax > 0) {'name': 'Professional Tax (PT)', 'val': payslip.professionalTax},
      if (payslip.tds > 0) {'name': 'TDS Income Tax', 'val': payslip.tds},
      if (payslip.lopDeduction > 0) {'name': 'Loss of Pay (LOP)', 'val': payslip.lopDeduction},
      if (payslip.loanEmi > 0) {'name': 'Salary Loan EMI', 'val': payslip.loanEmi},
    ];

    double totalEarnings = earnings.fold(0, (sum, item) => sum + (item['val'] as double));
    double totalDeductions = deductions.fold(0, (sum, item) => sum + (item['val'] as double));

    int rowCount = earnings.length > deductions.length ? earnings.length : deductions.length;
    if (rowCount < 5) rowCount = 5;

    for (int i = 0; i < rowCount; i++) {
      PdfColor rowBg = i % 2 == 0 ? PdfColor(248, 250, 252) : PdfColor(255, 255, 255);
      
      // Left row (Earnings)
      g.drawRectangle(brush: PdfSolidBrush(rowBg), bounds: Rect.fromLTWH(0, y, 240, 20));
      if (i < earnings.length) {
        g.drawString(earnings[i]['name'] as String, standardFont, bounds: Rect.fromLTWH(8, y + 4, 150, 16));
        g.drawString((earnings[i]['val'] as double).toStringAsFixed(2), standardFont, bounds: Rect.fromLTWH(160, y + 4, 75, 16));
      }

      // Right row (Deductions)
      g.drawRectangle(brush: PdfSolidBrush(rowBg), bounds: Rect.fromLTWH(260, y, 240, 20));
      if (i < deductions.length) {
        g.drawString(deductions[i]['name'] as String, standardFont, bounds: Rect.fromLTWH(268, y + 4, 150, 16));
        g.drawString((deductions[i]['val'] as double).toStringAsFixed(2), standardFont, bounds: Rect.fromLTWH(420, y + 4, 75, 16));
      }
      y += 20;
    }

    // Totals Row
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1), Offset(0, y), Offset(240, y));
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1), Offset(260, y), Offset(500, y));
    y += 5;

    g.drawString('Total Gross Earnings', boldFont, bounds: Rect.fromLTWH(8, y, 150, 16));
    g.drawString('INR ${totalEarnings.toStringAsFixed(2)}', boldFont, bounds: Rect.fromLTWH(150, y, 85, 16));

    g.drawString('Total Deductions', boldFont, bounds: Rect.fromLTWH(268, y, 150, 16));
    g.drawString('INR ${totalDeductions.toStringAsFixed(2)}', boldFont, bounds: Rect.fromLTWH(410, y, 85, 16));

    y += 30;

    // 4. NET TAKE HOME PAY Highlight Banner
    g.drawRectangle(
      brush: PdfSolidBrush(PdfColor(16, 185, 129)), // Emerald Green
      bounds: Rect.fromLTWH(0, y, 500, 45),
    );
    g.drawString(
      'NET TAKE HOME SALARY',
      sectionFont,
      brush: PdfBrushes.white,
      bounds: Rect.fromLTWH(15, y + 14, 250, 20),
    );
    g.drawString(
      'INR ${payslip.netPay.toStringAsFixed(2)}',
      headerFont,
      brush: PdfBrushes.white,
      bounds: Rect.fromLTWH(280, y + 10, 200, 25),
    );

    y += 65;

    final hr = Provider.of<HrProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final payslips = (auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr') ? hr.staffPayslips : hr.myPayslips;
    final ytdEarnings = _calculateYTDEarnings(payslip, payslips);

    // 5. Digital Seal / Footer Note
    g.drawString('Payment Status: ${payslip.status.toUpperCase()}', boldFont, bounds: Rect.fromLTWH(0, y, 300, 16));
    g.drawString('Disbursement Date: ${payslip.paymentDate ?? "Current Cycle"}', standardFont, bounds: Rect.fromLTWH(0, y + 16, 300, 16));
    g.drawString('YTD Earnings (Year-to-Date): INR ${ytdEarnings.toStringAsFixed(2)}', boldFont, bounds: Rect.fromLTWH(0, y + 32, 300, 16));

    g.drawString(
      'This is an authentic computer-generated document issued by Enterprise HRMS System.',
      PdfStandardFont(PdfFontFamily.helvetica, 8, style: PdfFontStyle.italic),
      brush: PdfSolidBrush(PdfColor(100, 116, 139)),
      bounds: Rect.fromLTWH(0, y + 56, 500, 16),
    );

    final bytes = await document.save();
    document.dispose();

    final tempDir = await getTemporaryDirectory();
    final sanitizedMonth = payslip.month.replaceAll(' ', '_');
    final empNameSanitized = (payslip.employeeName ?? 'Employee').replaceAll(' ', '_');
    final file = File('${tempDir.path}/Payslip_${empNameSanitized}_$sanitizedMonth.pdf');
    await file.writeAsBytes(bytes);
    return file;
  }

  Future<void> _exportPayslipPDF(Payslip payslip) async {
    final file = await _generatePayslipPDFFile(payslip);
    final xFile = XFile(file.path);
    await Share.shareXFiles([xFile], text: 'Official Payslip PDF for ${payslip.month}');
  }

  // ==========================================
  // 💬 WHATSAPP SHARE IMPLEMENTATION
  // ==========================================
  Future<void> _sharePayslipViaWhatsApp(BuildContext context, Payslip payslip, {String? empPhone}) async {
    try {
      final file = await _generatePayslipPDFFile(payslip);
      final xFile = XFile(file.path);
      
      final empName = payslip.employeeName ?? 'Employee';
      final messageText = 
          "📄 *OFFICIAL SALARY PAYSLIP*\n\n"
          "Hello *$empName*,\n"
          "Here is your official PDF Payslip for *${payslip.month}*.\n\n"
          "🔹 *Net Salary:* ₹ ${payslip.netPay.toStringAsFixed(0)}\n"
          "🔹 *Status:* ${payslip.status}\n\n"
          "Please find the attached PDF document.";

      if (empPhone != null && empPhone.trim().isNotEmpty) {
        final cleanPhone = empPhone.replaceAll(RegExp(r'[^\d+]'), '');
        final whatsappUrl = Uri.parse("https://wa.me/$cleanPhone?text=${Uri.encodeComponent(messageText)}");
        if (await canLaunchUrl(whatsappUrl)) {
          await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
        }
      }

      // Share PDF document to WhatsApp / target apps
      await Share.shareXFiles([xFile], text: messageText);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share payslip PDF: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  // ==========================================
  // 🖼️ PAYSLIP FORMAT PREVIEW MODAL
  // ==========================================
  void _showFormatPreviewModal(BuildContext context, Payslip payslip) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final payslips = (auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr') ? hr.staffPayslips : hr.myPayslips;
    final ytdEarnings = _calculateYTDEarnings(payslip, payslips);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'PDF Payslip Format Preview',
                    style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: Color(0xFFE2E8F0)),
              const SizedBox(height: 10),

              Expanded(
                child: SingleChildScrollView(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                      boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 10)],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // PDF Header Banner
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('ENTERPRISE HRMS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                              SizedBox(height: 4),
                              Text('CONFIDENTIAL SALARY PAYSLIP STATEMENT', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Employee Details Box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('EMPLOYEE DETAILS', style: TextStyle(color: Color(0xFF2563EB), fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    Text('Name: ${payslip.employeeName ?? "Staff Member"}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                    Text('ID: ${payslip.employeeEmpId ?? "EMP-DEFAULT"}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('PAY STATEMENT INFO', style: TextStyle(color: Color(0xFF2563EB), fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    Text('Month: ${payslip.month}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                    Text('Dept: ${payslip.employeeDepartment ?? "General"}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Earnings vs Deductions Preview Table
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Earnings Column
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    color: const Color(0xFF2563EB),
                                    width: double.infinity,
                                    child: const Text('EARNINGS (INR)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                                  ),
                                  _previewRow('Basic Salary', payslip.basicPay),
                                  _previewRow('HRA', payslip.hra),
                                  _previewRow('Special Allowance', payslip.specialAllowance),
                                  if (payslip.overtimePay > 0) _previewRow('Overtime Pay', payslip.overtimePay),
                                  if (payslip.bonus > 0) _previewRow('Bonus', payslip.bonus),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Deductions Column
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    color: const Color(0xFFEF4444),
                                    width: double.infinity,
                                    child: const Text('DEDUCTIONS (INR)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                                  ),
                                  if (payslip.pfDeduction > 0) _previewRow('PF Deduction', payslip.pfDeduction),
                                  if (payslip.esiDeduction > 0) _previewRow('ESI Insurance', payslip.esiDeduction),
                                  if (payslip.professionalTax > 0) _previewRow('PT Tax', payslip.professionalTax),
                                  if (payslip.tds > 0) _previewRow('TDS Tax', payslip.tds),
                                  if (payslip.lopDeduction > 0) _previewRow('LOP Days', payslip.lopDeduction),
                                  if (payslip.loanEmi > 0) _previewRow('Loan EMI', payslip.loanEmi),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // YTD & Net Take Home Banner
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('YTD EARNINGS (Year-to-Date)', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11)),
                                  Text('₹ ${ytdEarnings.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('NET TAKE HOME SALARY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                  Text('₹ ${payslip.netPay.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Footer Note
                        Center(
                          child: Text(
                            'This is a computer-generated PDF document. Confidential.',
                            style: TextStyle(color: Colors.grey[500], fontSize: 10, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _sharePayslipViaWhatsApp(context, payslip);
                },
                icon: const Icon(Icons.send_rounded, color: Colors.white),
                label: const Text('Send via WhatsApp (PDF)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366), // WhatsApp Green
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _previewRow(String title, double amount) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 10, color: Color(0xFF475569)), overflow: TextOverflow.ellipsis)),
          Text('₹${amount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }

  void _showDetails(Payslip payslip, List<Payslip> payslips) {
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
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFEF4444)),
                        tooltip: 'Preview PDF Format',
                        onPressed: () {
                          Navigator.pop(context);
                          _showFormatPreviewModal(context, payslip);
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.share_rounded, color: Color(0xFF2563EB)),
                        tooltip: 'Export & Share PDF',
                        onPressed: () {
                          Navigator.pop(context);
                          _exportPayslipPDF(payslip);
                        },
                      ),
                    ],
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

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'YTD EARNINGS (Year-to-Date)',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '₹ ${_calculateYTDEarnings(payslip, payslips).toStringAsFixed(1)}',
                    style: const TextStyle(color: Color(0xFF475569), fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
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

              // WhatsApp Share Action Button
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _sharePayslipViaWhatsApp(context, payslip);
                },
                icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                label: const Text('Send Payslip via WhatsApp (PDF)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366), // WhatsApp Brand Green
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 8),

              // Format Preview Button
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _showFormatPreviewModal(context, payslip);
                },
                icon: const Icon(Icons.visibility_rounded, color: Color(0xFF2563EB), size: 18),
                label: const Text('Preview Payslip Format', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: Color(0xFF2563EB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
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
                        onTap: () => _showDetails(slip, payslips),
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
