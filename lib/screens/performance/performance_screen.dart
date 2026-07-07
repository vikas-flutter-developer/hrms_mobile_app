import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/performance_review.dart';
import '../../utils/pdf_downloader.dart';

class PerformanceScreen extends StatefulWidget {
  const PerformanceScreen({super.key});

  @override
  State<PerformanceScreen> createState() => _PerformanceScreenState();
}

class _PerformanceScreenState extends State<PerformanceScreen> {
  // ==========================================
  // 📜 PDF APPRAISAL STATEMENT GENERATOR
  // ==========================================
  // Returns raw bytes — works on both web and mobile.
  Future<List<int>> _generateAppraisalBytes(PerformanceReviewModel review) async {
    final document = PdfDocument();
    final page = document.pages.add();
    final g = page.graphics;

    final headerFont = PdfStandardFont(PdfFontFamily.helvetica, 18, style: PdfFontStyle.bold);
    final subHeaderFont = PdfStandardFont(PdfFontFamily.helvetica, 11, style: PdfFontStyle.bold);
    final sectionFont = PdfStandardFont(PdfFontFamily.helvetica, 12, style: PdfFontStyle.bold);
    final boldFont = PdfStandardFont(PdfFontFamily.helvetica, 10, style: PdfFontStyle.bold);
    final standardFont = PdfStandardFont(PdfFontFamily.helvetica, 10);

    // 1. Top Banner Box
    g.drawRectangle(
      brush: PdfSolidBrush(PdfColor(15, 23, 42)),
      bounds: const Rect.fromLTWH(0, 0, 500, 55),
    );
    g.drawString('ENTERPRISE HRMS', headerFont, brush: PdfBrushes.white,
        bounds: const Rect.fromLTWH(15, 12, 350, 25));
    g.drawString('CONFIDENTIAL PERFORMANCE REVIEW & APPRAISAL', subHeaderFont,
        brush: PdfSolidBrush(PdfColor(148, 163, 184)),
        bounds: const Rect.fromLTWH(15, 33, 350, 18));

    double y = 70;

    // 2. Employee Info Box
    g.drawRectangle(
      pen: PdfPen(PdfColor(226, 232, 240), width: 1),
      brush: PdfSolidBrush(PdfColor(248, 250, 252)),
      bounds: Rect.fromLTWH(0, y, 500, 65),
    );
    g.drawString('EMPLOYEE DETAILS', subHeaderFont, brush: PdfSolidBrush(PdfColor(37, 99, 235)),
        bounds: Rect.fromLTWH(12, y + 8, 200, 16));
    g.drawString('Name: ${review.employeeName}', boldFont, bounds: Rect.fromLTWH(12, y + 26, 230, 16));
    g.drawString('ID: ${review.employeeEmpId}', standardFont, bounds: Rect.fromLTWH(12, y + 42, 230, 16));
    g.drawString('CYCLE DETAILS', subHeaderFont, brush: PdfSolidBrush(PdfColor(37, 99, 235)),
        bounds: Rect.fromLTWH(260, y + 8, 200, 16));
    g.drawString('Cycle: ${review.cycleName}', boldFont, bounds: Rect.fromLTWH(260, y + 26, 230, 16));
    g.drawString('Department: ${review.employeeDepartment}', standardFont, bounds: Rect.fromLTWH(260, y + 42, 230, 16));
    y += 80;

    // 3. Rating & Status Box
    g.drawRectangle(
      pen: PdfPen(PdfColor(226, 232, 240), width: 1),
      bounds: Rect.fromLTWH(0, y, 500, 50),
    );
    g.drawString('PERFORMANCE RATING', subHeaderFont, brush: PdfSolidBrush(PdfColor(217, 119, 6)),
        bounds: Rect.fromLTWH(12, y + 10, 200, 16));
    g.drawString('${review.rating} / 5.0 Stars', headerFont, brush: PdfSolidBrush(PdfColor(217, 119, 6)),
        bounds: Rect.fromLTWH(12, y + 26, 200, 25));
    g.drawString('STATUS', subHeaderFont, brush: PdfSolidBrush(PdfColor(100, 116, 139)),
        bounds: Rect.fromLTWH(260, y + 10, 200, 16));
    g.drawString(review.status.toUpperCase(), headerFont, brush: PdfSolidBrush(PdfColor(16, 185, 129)),
        bounds: Rect.fromLTWH(260, y + 26, 200, 25));
    y += 65;

    // 4. Comments
    g.drawString('OVERALL PERFORMANCE FEEDBACK & COMMENTS', sectionFont,
        brush: PdfSolidBrush(PdfColor(15, 23, 42)), bounds: Rect.fromLTWH(0, y, 500, 20));
    y += 24;
    g.drawString(review.overallComments, standardFont, bounds: Rect.fromLTWH(0, y, 500, 120));
    y += 140;

    // 5. Signatures
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1), Offset(0, y), Offset(150, y));
    g.drawString('Evaluated By: ${review.reviewerName}', standardFont,
        bounds: Rect.fromLTWH(0, y + 6, 200, 20));
    g.drawLine(PdfPen(PdfColor(148, 163, 184), width: 1), Offset(350, y), Offset(500, y));
    g.drawString('Signature / Date', standardFont, bounds: Rect.fromLTWH(350, y + 6, 150, 20));

    final bytes = await document.save();
    document.dispose();
    return bytes;
  }

  // ==========================================
  // 👁️ APPRAISAL PREVIEW + DOWNLOAD DIALOG
  // ==========================================
  void _showAppraisalPreview(BuildContext context, PerformanceReviewModel review) {
    Color statusColor;
    switch (review.status) {
      case 'Finalized': statusColor = const Color(0xFF10B981); break;
      case 'Reviewed': statusColor = const Color(0xFF0284C7); break;
      case 'Submitted': statusColor = const Color(0xFF8B5CF6); break;
      default: statusColor = const Color(0xFF64748B);
    }

    showDialog(
      context: context,
      builder: (ctx) {
        bool isDownloading = false;
        return StatefulBuilder(builder: (ctx, setDlgState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            contentPadding: const EdgeInsets.all(0),
            content: SizedBox(
              width: 400,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dialog Header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                    decoration: const BoxDecoration(
                      color: Color(0xFF0F172A),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.analytics_rounded, color: Color(0xFF38BDF8), size: 22),
                        SizedBox(width: 10),
                        Text('Appraisal Preview', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  ),
                  // Appraisal Card Mockup
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Name + Status Row
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: const BoxDecoration(color: Color(0xFFFEF3C7), shape: BoxShape.circle),
                                child: const Icon(Icons.star_rounded, color: Color(0xFFD97706), size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(review.employeeName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                                    Text('${review.employeeEmpId} • ${review.employeeDepartment}',
                                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(review.status,
                                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(review.cycleName,
                              style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.w600)),
                          const Divider(height: 20, color: Color(0xFFE2E8F0)),
                          // Star Rating
                          Row(
                            children: [
                              ...List.generate(5, (i) => Icon(
                                i < review.rating ? Icons.star_rounded : Icons.star_border_rounded,
                                size: 18, color: const Color(0xFFF59E0B),
                              )),
                              const SizedBox(width: 8),
                              Text('${review.rating}/5', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF59E0B))),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // Comments
                          Text(review.overallComments,
                              style: const TextStyle(color: Color(0xFF334155), fontSize: 13, height: 1.4)),
                          const SizedBox(height: 10),
                          Text('Evaluated by: ${review.reviewerName}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  // Action Buttons
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(ctx),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF64748B),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('Close'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: isDownloading
                                ? null
                                : () async {
                                    setDlgState(() => isDownloading = true);
                                    try {
                                      final bytes = await _generateAppraisalBytes(review);
                                      final filename = 'Appraisal_${review.employeeName.replaceAll(' ', '_')}.pdf';
                                      if (kIsWeb) {
                                        downloadPdfBytes(bytes, filename);
                                      } else {
                                        final tempDir = await getTemporaryDirectory();
                                        final file = File('${tempDir.path}/$filename');
                                        await file.writeAsBytes(bytes);
                                        await Share.shareXFiles([XFile(file.path)],
                                            text: '📊 Performance Appraisal for ${review.employeeName}');
                                      }
                                      if (ctx.mounted) Navigator.pop(ctx);
                                    } catch (e) {
                                      setDlgState(() => isDownloading = false);
                                      if (ctx.mounted) {
                                        ScaffoldMessenger.of(ctx).showSnackBar(
                                          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
                                        );
                                      }
                                    }
                                  },
                            icon: isDownloading
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.download_rounded, size: 18),
                            label: Text(isDownloading ? 'Downloading...' : 'Download PDF'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0284C7),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        });
      },
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';
      hr.fetchPerformanceReviews();
      hr.fetchKPIs(mineOnly: !isAdminOrHr);
      hr.fetchMyTeam();
    });
  }

  void _showAddReviewModal(BuildContext context, {PerformanceReviewModel? review}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final commentsCtrl = TextEditingController(text: review?.overallComments);
    double rating = review?.rating.toDouble() ?? 4.0;
    String status = review?.status ?? 'Draft';

    // Match employee ID
    String? selectedEmployeeId;
    if (review != null) {
      final matchEmp = hr.myTeam.firstWhere(
        (e) => e.name == review.employeeName,
        orElse: () => hr.myTeam.first,
      );
      selectedEmployeeId = matchEmp.id;
    } else {
      selectedEmployeeId = hr.myTeam.isNotEmpty ? hr.myTeam.first.id : null;
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
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        review == null ? 'Draft Performance Appraisal' : 'Edit Appraisal Details',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Select Employee Dropdown
                      if (review == null) ...[
                        DropdownButtonFormField<String>(
                          value: selectedEmployeeId,
                          decoration: InputDecoration(
                            labelText: 'Employee to Evaluate',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: hr.myTeam.map((emp) {
                            return DropdownMenuItem(
                              value: emp.id,
                              child: Text('${emp.name} (${emp.positionLevel ?? 'Staff'})', overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                          validator: (v) => v == null ? 'Please select an employee' : null,
                          onChanged: (val) {
                            setModalState(() => selectedEmployeeId = val);
                          },
                        ),
                        const SizedBox(height: 12),
                      ] else ...[
                        Text(
                          'Evaluating: ${review.employeeName} (${review.employeeEmpId})',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Rating slider
                      Text(
                        'Performance Rating: ${rating.toStringAsFixed(0)} / 5 Stars',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155)),
                      ),
                      Slider(
                        value: rating,
                        min: 1.0,
                        max: 5.0,
                        divisions: 4,
                        activeColor: const Color(0xFFF59E0B),
                        inactiveColor: const Color(0xFFE2E8F0),
                        onChanged: (val) {
                          setModalState(() => rating = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: status,
                        decoration: InputDecoration(
                          labelText: 'Review Status',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Draft', child: Text('📝 Save as Draft')),
                          DropdownMenuItem(value: 'Submitted', child: Text('📤 Submit for Review')),
                          DropdownMenuItem(value: 'Reviewed', child: Text('👀 Checked & Reviewed')),
                          DropdownMenuItem(value: 'Finalized', child: Text('🔒 Lock & Finalize')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => status = val);
                          }
                        },
                      ),
                      const SizedBox(height: 12),

                      // Comments
                      TextFormField(
                        controller: commentsCtrl,
                        maxLines: 4,
                        decoration: InputDecoration(
                          labelText: 'Overall Performance Comments / Feedback',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter appraisal notes' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;

                          // Fallback to active cycle or find cycle from hr provider
                          String cycleId = '6a2bc86cc15e379018d245da'; // Fallback seed cycle ID or dynamic check
                          if (hr.reportOverview.containsKey('stats') && hr.reportOverview['stats']['activeCycleId'] != null) {
                            cycleId = hr.reportOverview['stats']['activeCycleId'];
                          }

                          bool success;
                          if (review == null) {
                            success = await hr.createPerformanceReview(
                              employeeId: selectedEmployeeId!,
                              cycleId: cycleId,
                              rating: rating,
                              overallComments: commentsCtrl.text.trim(),
                              status: status,
                            );
                          } else {
                            success = await hr.updatePerformanceReview(
                              id: review.id,
                              rating: rating,
                              overallComments: commentsCtrl.text.trim(),
                              status: status,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Appraisal saved!' : 'Failed to save appraisal.'),
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
                        child: Text(review == null ? 'Draft Evaluation' : 'Update Appraisal', style: const TextStyle(fontWeight: FontWeight.bold)),
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
          title: const Text('Delete Appraisal Record?'),
          content: const Text('Are you sure you want to permanently delete this performance evaluation record?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deletePerformanceReview(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Record deleted!' : 'Error deleting record.'),
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

  Widget _buildKPIsTab(HrProvider hr, bool isAdminOrHr) {
    if (hr.isLoading && hr.kpis.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (hr.kpis.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.track_changes_rounded, size: 56, color: Colors.grey[400]),
            const SizedBox(height: 12),
            const Text('No key goals or KPIs defined yet.', style: TextStyle(color: Color(0xFF64748B))),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        hr.fetchKPIs(mineOnly: !isAdminOrHr);
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: hr.kpis.length,
        itemBuilder: (context, index) {
          final kpi = hr.kpis[index];
          final String id = kpi['_id']?.toString() ?? '';
          final String title = kpi['title']?.toString() ?? 'KPI Goal';
          final String desc = kpi['description']?.toString() ?? '';
          final double targetVal = (kpi['targetValue'] as num?)?.toDouble() ?? 100.0;
          final double currentVal = (kpi['currentValue'] as num?)?.toDouble() ?? 0.0;
          final double baseline = (kpi['baseline'] as num?)?.toDouble() ?? 0.0;
          final String unit = kpi['unit']?.toString() ?? '%';
          final double weight = (kpi['weight'] as num?)?.toDouble() ?? 1.0;
          final String frequency = kpi['frequency']?.toString() ?? 'Quarterly';
          final String empName = kpi['employee'] is Map ? (kpi['employee']['name']?.toString() ?? 'Company Goal') : 'Company Goal';
          
          double progress = 0.0;
          if (targetVal - baseline > 0) {
            progress = ((currentVal - baseline) / (targetVal - baseline)).clamp(0.0, 1.0);
          }

          return Card(
            elevation: 2,
            color: Colors.white,
            shadowColor: const Color(0x050F172A),
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                      ),
                      if (isAdminOrHr) ...[
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
                          onPressed: () async {
                            final success = await hr.deleteKPI(id);
                            if (context.mounted && success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('KPI goal deleted successfully!'), backgroundColor: Colors.green),
                              );
                            }
                          },
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('Assignee: $empName • Weight: x$weight • Frequency: $frequency', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  const SizedBox(height: 8),
                  Text(desc, style: const TextStyle(color: Color(0xFF334155), fontSize: 13)),
                  const SizedBox(height: 12),
                  
                  // Progress indicator row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Current: $currentVal $unit (Target: $targetVal $unit)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                      Text('${(progress * 100).toStringAsFixed(0)}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 6,
                      backgroundColor: const Color(0xFFF1F5F9),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0284C7)),
                    ),
                  ),

                  // If manager/admin, show "Update Progress" button
                  if (isAdminOrHr) ...[
                    const Divider(height: 24, color: Color(0xFFF1F5F9)),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () => _showUpdateKPIProgressDialog(context, hr, id, currentVal, targetVal, unit),
                        icon: const Icon(Icons.edit_road_rounded, size: 16),
                        label: const Text('Update Progress Value', style: TextStyle(fontWeight: FontWeight.bold)),
                        style: TextButton.styleFrom(foregroundColor: const Color(0xFF0284C7)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showUpdateKPIProgressDialog(BuildContext context, HrProvider hr, String kpiId, double currentVal, double targetVal, String unit) {
    final ctrl = TextEditingController(text: currentVal.toString());
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Update Goal Progress'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Enter current achievement value (Target: $targetVal $unit):', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Current Value ($unit)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final val = double.tryParse(ctrl.text);
                if (val != null) {
                  Navigator.pop(ctx);
                  final success = await hr.updateKPIProgress(id: kpiId, currentValue: val);
                  if (context.mounted && success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('KPI goal progress updated!'), backgroundColor: Colors.green),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7), foregroundColor: Colors.white),
              child: const Text('Update'),
            ),
          ],
        );
      },
    );
  }

  void _showAddKPIDialog(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final unitCtrl = TextEditingController(text: '%');
    final targetCtrl = TextEditingController(text: '100');
    final baselineCtrl = TextEditingController(text: '0');
    final weightCtrl = TextEditingController(text: '1.0');
    String frequency = 'Quarterly';
    String? selectedEmpId = hr.myTeam.isNotEmpty ? hr.myTeam.first.id : null;

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
                        'Set Employee KPI Goal',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Select Employee Dropdown
                      DropdownButtonFormField<String>(
                        value: selectedEmpId,
                        decoration: InputDecoration(
                          labelText: 'Target Employee',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: hr.myTeam.map((emp) {
                          return DropdownMenuItem(
                            value: emp.id,
                            child: Text('${emp.name} (${emp.positionLevel ?? 'Staff'})', overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        validator: (v) => v == null ? 'Please select an employee' : null,
                        onChanged: (val) {
                          setModalState(() => selectedEmpId = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Goal Title (e.g. Sales Target)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter goal title' : null,
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: descCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Goal/KPI Description',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter description' : null,
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: targetCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Target Value',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (v) => v == null || double.tryParse(v) == null ? 'Enter number' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: unitCtrl,
                              decoration: InputDecoration(
                                labelText: 'Unit (e.g. %, USD)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Enter unit' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: baselineCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Baseline (Start)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (v) => v == null || double.tryParse(v) == null ? 'Enter number' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: weightCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Weight (x1.0)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              validator: (v) => v == null || double.tryParse(v) == null ? 'Enter number' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: frequency,
                        decoration: InputDecoration(
                          labelText: 'Measurement Frequency',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Monthly', child: Text('Monthly')),
                          DropdownMenuItem(value: 'Quarterly', child: Text('Quarterly')),
                          DropdownMenuItem(value: 'Half-Yearly', child: Text('Half-Yearly')),
                          DropdownMenuItem(value: 'Yearly', child: Text('Yearly')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() => frequency = val);
                          }
                        },
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          // Find target employee dept
                          final emp = hr.myTeam.firstWhere((e) => e.id == selectedEmpId);
                          final dept = emp.department ?? 'Engineering';

                          final success = await hr.createKPI(
                            title: titleCtrl.text.trim(),
                            description: descCtrl.text.trim(),
                            employeeId: selectedEmpId,
                            department: dept,
                            unit: unitCtrl.text.trim(),
                            targetValue: double.parse(targetCtrl.text),
                            baseline: double.parse(baselineCtrl.text),
                            weight: double.parse(weightCtrl.text),
                            frequency: frequency,
                          );

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'KPI goal set successfully!' : 'Failed to save KPI.'),
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
                        child: const Text('Set Goal', style: TextStyle(fontWeight: FontWeight.bold)),
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

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF1F5F9),
        appBar: AppBar(
          title: const Text('Performance & Appraisals', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
          bottom: const TabBar(
            labelColor: Color(0xFF0284C7),
            unselectedLabelColor: Color(0xFF64748B),
            indicatorColor: Color(0xFF0284C7),
            tabs: [
              Tab(text: 'Appraisals & Reviews'),
              Tab(text: 'Goals & KPIs'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Tab 1: Appraisals & Reviews
            hr.isLoading && hr.performanceReviews.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : hr.performanceReviews.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.rate_review_outlined, size: 56, color: Color(0xFF94A3B8)),
                            SizedBox(height: 12),
                            Text('No appraisal cycles active or reviews drafted.', style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async => hr.fetchPerformanceReviews(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: hr.performanceReviews.length,
                          itemBuilder: (context, index) {
                            final review = hr.performanceReviews[index];

                            Color statusColor;
                            switch (review.status) {
                              case 'Finalized': statusColor = const Color(0xFF10B981); break;
                              case 'Reviewed': statusColor = const Color(0xFF0284C7); break;
                              case 'Submitted': statusColor = const Color(0xFF8B5CF6); break;
                              default: statusColor = const Color(0xFF64748B);
                            }

                            return Card(
                              elevation: 2,
                              color: Colors.white,
                              shadowColor: const Color(0x050F172A),
                              margin: const EdgeInsets.only(bottom: 14),
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
                                          decoration: const BoxDecoration(
                                            color: Color(0xFFFEF3C7), // Yellow 100
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.star_rounded, color: Color(0xFFD97706)),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                review.employeeName,
                                                style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                                              ),
                                              Text(
                                                'ID: ${review.employeeEmpId} • ${review.employeeDepartment}',
                                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                review.cycleName,
                                                style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.w600),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: statusColor.withOpacity(0.12),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                review.status,
                                                style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              children: List.generate(5, (starIdx) {
                                                return Icon(
                                                  starIdx < review.rating ? Icons.star_rounded : Icons.star_border_rounded,
                                                  size: 14,
                                                  color: const Color(0xFFF59E0B),
                                                );
                                              }),
                                            ),
                                          ],
                                        ),
                                        if (isAdminOrHr) ...[
                                          const SizedBox(width: 4),
                                          PopupMenuButton<String>(
                                            icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B), size: 20),
                                            onSelected: (val) {
                                              if (val == 'edit') {
                                                _showAddReviewModal(context, review: review);
                                              } else if (val == 'delete') {
                                                _confirmDelete(context, review.id);
                                              }
                                            },
                                            itemBuilder: (context) => [
                                              const PopupMenuItem(
                                                value: 'edit',
                                                child: Row(
                                                  children: [
                                                    Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                                                    SizedBox(width: 8),
                                                    Text('Edit Evaluation'),
                                                  ],
                                                ),
                                              ),
                                              const PopupMenuItem(
                                                value: 'delete',
                                                child: Row(
                                                  children: [
                                                    Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                                                    SizedBox(width: 8),
                                                    Text('Delete Record', style: TextStyle(color: Colors.redAccent)),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                    const Divider(color: Color(0xFFE2E8F0), height: 24),
                                    Text(
                                      review.overallComments,
                                      style: const TextStyle(color: Color(0xFF334155), fontSize: 13, height: 1.4),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Evaluated by: ${review.reviewerName}',
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.download_rounded, size: 18, color: Color(0xFF0284C7)),
                                          tooltip: 'Preview & Download Appraisal PDF',
                                          onPressed: () => _showAppraisalPreview(context, review),
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
            // Tab 2: Goals & KPIs
            _buildKPIsTab(hr, isAdminOrHr),
          ],
        ),
        floatingActionButton: isAdminOrHr
            ? Builder(
                builder: (context) {
                  final tabController = DefaultTabController.of(context);
                  return AnimatedBuilder(
                    animation: tabController,
                    builder: (context, _) {
                      final index = tabController.index;
                      return FloatingActionButton.extended(
                        onPressed: () {
                          if (index == 0) {
                            _showAddReviewModal(context);
                          } else {
                            _showAddKPIDialog(context);
                          }
                        },
                        backgroundColor: const Color(0xFF0284C7),
                        icon: Icon(index == 0 ? Icons.add_task_rounded : Icons.track_changes_rounded, color: Colors.white),
                        label: Text(index == 0 ? 'Add Appraisal' : 'Set KPI Goal', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      );
                    }
                  );
                }
              )
            : null,
      ),
    );
  }
}
