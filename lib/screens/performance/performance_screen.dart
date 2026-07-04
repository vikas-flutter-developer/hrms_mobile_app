import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/performance_review.dart';

class PerformanceScreen extends StatefulWidget {
  const PerformanceScreen({super.key});

  @override
  State<PerformanceScreen> createState() => _PerformanceScreenState();
}

class _PerformanceScreenState extends State<PerformanceScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchPerformanceReviews();
      hr.fetchMyTeam(); // Ensure staff directory is loaded for the employee dropdown
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

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Performance & Appraisals', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.isLoading && hr.performanceReviews.isEmpty
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
                                  const Icon(Icons.arrow_forward_rounded, size: 12, color: Color(0xFF94A3B8)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () => _showAddReviewModal(context),
              backgroundColor: const Color(0xFF0284C7),
              icon: const Icon(Icons.add_task_rounded, color: Colors.white),
              label: const Text('Add Appraisal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }
}
