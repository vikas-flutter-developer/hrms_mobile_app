import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';
import '../../providers/hr_provider.dart';
import '../../models/app_user.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _feedbackFormKey = GlobalKey<FormState>();
  final _commentCtrl = TextEditingController();
  double _rating = 5.0;

  // Program text controllers
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _trainerCtrl = TextEditingController();
  String _category = 'Technical';
  String _mode = 'Online';

  // ==========================================
  // 📜 PDF CERTIFICATE GENERATOR
  // ==========================================
  Future<File> _generateCertificatePDFFile(String traineeName, String courseTitle, String trainer) async {
    final document = PdfDocument();
    document.pageSettings.orientation = PdfPageOrientation.landscape;
    final page = document.pages.add();
    final g = page.graphics;

    final double width = page.getClientSize().width;
    final double height = page.getClientSize().height;

    // Golden frame borders
    final borderPen = PdfPen(PdfColor(218, 165, 32), width: 4); // Golden
    final innerPen = PdfPen(PdfColor(218, 165, 32), width: 1);
    g.drawRectangle(pen: borderPen, bounds: Rect.fromLTWH(10, 10, width - 20, height - 20));
    g.drawRectangle(pen: innerPen, bounds: Rect.fromLTWH(16, 16, width - 32, height - 32));

    final titleFont = PdfStandardFont(PdfFontFamily.helvetica, 28, style: PdfFontStyle.bold);
    final textFont = PdfStandardFont(PdfFontFamily.helvetica, 12, style: PdfFontStyle.italic);
    final nameFont = PdfStandardFont(PdfFontFamily.helvetica, 24, style: PdfFontStyle.bold);
    final courseFont = PdfStandardFont(PdfFontFamily.helvetica, 16, style: PdfFontStyle.bold);
    final footerFont = PdfStandardFont(PdfFontFamily.helvetica, 10);

    g.drawString(
      'CERTIFICATE OF COMPLETION',
      titleFont,
      brush: PdfSolidBrush(PdfColor(15, 23, 42)),
      bounds: Rect.fromLTWH(0, 50, width, 40),
      format: PdfStringFormat(alignment: PdfTextAlignment.center),
    );

    g.drawString(
      'This is proudly presented to',
      textFont,
      brush: PdfSolidBrush(PdfColor(100, 116, 139)),
      bounds: Rect.fromLTWH(0, 100, width, 24),
      format: PdfStringFormat(alignment: PdfTextAlignment.center),
    );

    g.drawString(
      traineeName,
      nameFont,
      brush: PdfSolidBrush(PdfColor(2, 132, 199)),
      bounds: Rect.fromLTWH(0, 130, width, 40),
      format: PdfStringFormat(alignment: PdfTextAlignment.center),
    );

    g.drawString(
      'for successfully completing the course',
      textFont,
      brush: PdfSolidBrush(PdfColor(100, 116, 139)),
      bounds: Rect.fromLTWH(0, 180, width, 24),
      format: PdfStringFormat(alignment: PdfTextAlignment.center),
    );

    g.drawString(
      courseTitle,
      courseFont,
      brush: PdfSolidBrush(PdfColor(15, 23, 42)),
      bounds: Rect.fromLTWH(0, 210, width, 30),
      format: PdfStringFormat(alignment: PdfTextAlignment.center),
    );

    // Signature lines
    g.drawLine(
      PdfPen(PdfColor(148, 163, 184), width: 1),
      Offset(50, height - 70),
      Offset(200, height - 70),
    );
    g.drawString(
      'Date: ${DateTime.now().toString().split(' ')[0]}',
      footerFont,
      brush: PdfSolidBrush(PdfColor(15, 23, 42)),
      bounds: Rect.fromLTWH(50, height - 60, 150, 20),
    );

    g.drawLine(
      PdfPen(PdfColor(148, 163, 184), width: 1),
      Offset(width - 200, height - 70),
      Offset(width - 50, height - 70),
    );
    g.drawString(
      'Instructor: $trainer',
      footerFont,
      brush: PdfSolidBrush(PdfColor(15, 23, 42)),
      bounds: Rect.fromLTWH(width - 200, height - 60, 150, 20),
    );

    final bytes = await document.save();
    document.dispose();

    final tempDir = await getTemporaryDirectory();
    final sanitizedName = traineeName.replaceAll(RegExp(r'\s+'), '_');
    final file = File('${tempDir.path}/Certificate_${sanitizedName}.pdf');
    await file.writeAsBytes(bytes);
    return file;
  }

  // ==========================================
  // 👁️ CERTIFICATE PREVIEW & SEND PANEL
  // ==========================================
  void _showCertificatePreview(BuildContext context, Map<String, dynamic> assignment) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final emp = assignment['employee'] as Map<String, dynamic>? ?? {};
    final prog = assignment['trainingProgram'] as Map<String, dynamic>? ?? {};

    final empName = emp['name']?.toString() ?? 'Employee';
    final empId = emp['_id']?.toString() ?? '';
    final courseTitle = prog['title']?.toString() ?? 'Unspecified Course';
    final trainer = prog['trainer']?.toString() ?? 'Lead Architect';
    final dateStr = DateTime.now().toString().split(' ')[0];

    // Find full profile details for WhatsApp/Email communication
    AppUser? fullEmp;
    if (hr.myTeam.isNotEmpty) {
      try {
        fullEmp = hr.myTeam.firstWhere((e) => e.id == empId);
      } catch (_) {}
    }
    final empPhone = fullEmp?.phone ?? '';
    final empEmail = fullEmp?.email ?? emp['email']?.toString() ?? '';

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Preview & Share Certificate',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Golden Framed Certificate Mock UI
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFD4AF37), width: 3), // Golden border
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFD4AF37), width: 1),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.workspace_premium_rounded, color: Color(0xFFD4AF37), size: 40),
                        const SizedBox(height: 8),
                        const Text(
                          'CERTIFICATE OF COMPLETION',
                          style: TextStyle(
                            fontFamily: 'Serif',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF0F172A),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'This is proudly presented to',
                          style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          empName.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0284C7)),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'for successfully completing the course',
                          style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          courseTitle,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Date: $dateStr', style: const TextStyle(fontSize: 8, color: Color(0xFF64748B))),
                            Text('Trainer: $trainer', style: const TextStyle(fontSize: 8, color: Color(0xFF64748B))),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Select a channel to issue and transmit the official PDF certificate:',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          actionsAlignment: MainAxisAlignment.spaceEvenly,
          actionsPadding: const EdgeInsets.only(bottom: 16),
          actions: [
            // WhatsApp Share
            ElevatedButton.icon(
              onPressed: () async {
                // 1. Issue certificate record on backend DB
                await hr.issueCertificate(programId: prog['_id']?.toString() ?? '', employeeId: empId);
                
                // 2. Generate PDF and share
                final file = await _generateCertificatePDFFile(empName, courseTitle, trainer);
                final messageText = 
                    "🎓 *CONGRATULATIONS!*\n\n"
                    "Hello *$empName*,\n"
                    "We are proud to award you this Certificate of Completion for successfully finishing *${courseTitle}*.\n\n"
                    "Keep up the exceptional work! 🚀";

                if (empPhone.isNotEmpty) {
                  final cleanPhone = empPhone.replaceAll(RegExp(r'[^\d+]'), '');
                  final whatsappUrl = Uri.parse("https://wa.me/$cleanPhone?text=${Uri.encodeComponent(messageText)}");
                  if (await canLaunchUrl(whatsappUrl)) {
                    await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
                  }
                }
                
                await Share.shareXFiles([XFile(file.path)], text: messageText);
                if (context.mounted) Navigator.pop(context);
              },
              icon: const Icon(Icons.share_rounded, size: 16),
              label: const Text('WhatsApp / Share', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),

            // Mail Share
            OutlinedButton.icon(
              onPressed: () async {
                // 1. Issue certificate record on backend DB
                await hr.issueCertificate(programId: prog['_id']?.toString() ?? '', employeeId: empId);
                
                // 2. Generate PDF and share
                final file = await _generateCertificatePDFFile(empName, courseTitle, trainer);
                final subject = "Official Certification: $courseTitle";
                final body = "Dear $empName,\n\nCongratulations! Please find your official Completion Certificate for '$courseTitle' attached.\n\nWarm regards,\nHR Department";

                final Uri emailUri = Uri(
                  scheme: 'mailto',
                  path: empEmail,
                  queryParameters: {
                    'subject': subject,
                    'body': body,
                  },
                );

                if (await canLaunchUrl(emailUri)) {
                  await launchUrl(emailUri);
                } else {
                  await Share.shareXFiles([XFile(file.path)], text: body);
                }

                if (context.mounted) Navigator.pop(context);
              },
              icon: const Icon(Icons.email_outlined, size: 16),
              label: const Text('Email Cert', style: TextStyle(fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0284C7),
                side: const BorderSide(color: Color(0xFF0284C7)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchTrainingPrograms();
      hr.fetchTrainingAssignments();
      hr.fetchMyTeam(); // Directory list for dropdowns
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _commentCtrl.dispose();
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _trainerCtrl.dispose();
    super.dispose();
  }

  void _showFeedbackModal(BuildContext context, String programId) {
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
              child: Form(
                key: _feedbackFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Training Feedback',
                      style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Rating: ${_rating.toStringAsFixed(0)} / 5',
                      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14),
                    ),
                    Slider(
                      value: _rating,
                      min: 1.0,
                      max: 5.0,
                      divisions: 4,
                      activeColor: const Color(0xFF0284C7),
                      inactiveColor: const Color(0xFFE2E8F0),
                      onChanged: (val) {
                        setModalState(() {
                          _rating = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _commentCtrl,
                      maxLines: 3,
                      style: const TextStyle(color: Color(0xFF0F172A)),
                      decoration: InputDecoration(
                        labelText: 'Your comments',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) => value == null || value.trim().isEmpty ? 'Enter comments' : null,
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        if (!_feedbackFormKey.currentState!.validate()) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Feedback submitted! Thank you.'), backgroundColor: Colors.green),
                        );
                        _commentCtrl.clear();
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Submit Feedback', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showCreateProgramModal(BuildContext context, {Map<String, dynamic>? program}) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    
    _titleCtrl.text = program?['title']?.toString() ?? '';
    _descCtrl.text = program?['description']?.toString() ?? '';
    _trainerCtrl.text = program?['trainer']?.toString() ?? 'Senior Trainer';
    _category = program?['category']?.toString() ?? 'Technical';
    _mode = program?['mode']?.toString() ?? 'Online';
    String status = program?['status']?.toString() ?? 'Ongoing';

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
                        program == null ? 'Create Training Program' : 'Edit Course Details',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _titleCtrl,
                        decoration: InputDecoration(
                          labelText: 'Program Title (e.g. Flutter Advanced)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter title' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _category,
                        decoration: InputDecoration(
                          labelText: 'Category',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Technical', child: Text('Technical & Engineering')),
                          DropdownMenuItem(value: 'Compliance', child: Text('Legal & Compliance')),
                          DropdownMenuItem(value: 'Soft Skills', child: Text('Communication & Soft Skills')),
                          DropdownMenuItem(value: 'Onboarding', child: Text('New Staff Onboarding')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => _category = val);
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _mode,
                        decoration: InputDecoration(
                          labelText: 'Training Mode',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Online', child: Text('💻 Online (Self-Paced/Zoom)')),
                          DropdownMenuItem(value: 'Offline', child: Text('🏢 Offline (Classroom/Office)')),
                          DropdownMenuItem(value: 'Hybrid', child: Text('🔄 Hybrid Mode')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => _mode = val);
                        },
                      ),
                      const SizedBox(height: 12),
                      if (program != null) ...[
                        DropdownButtonFormField<String>(
                          value: status,
                          decoration: InputDecoration(
                            labelText: 'Status',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'Planned', child: Text('Planned')),
                            DropdownMenuItem(value: 'Ongoing', child: Text('Ongoing')),
                            DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                            DropdownMenuItem(value: 'Cancelled', child: Text('Cancelled')),
                          ],
                          onChanged: (val) {
                            if (val != null) setModalState(() => status = val);
                          },
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: _trainerCtrl,
                        decoration: InputDecoration(
                          labelText: 'Trainer / Host Authority',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter trainer name' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Agenda Description',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Enter description' : null,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () async {
                          if (!_formKey.currentState!.validate()) return;
                          
                          bool success;
                          if (program == null) {
                            success = await hr.createTrainingProgram(
                              title: _titleCtrl.text.trim(),
                              description: _descCtrl.text.trim(),
                              category: _category,
                              mode: _mode,
                              trainer: _trainerCtrl.text.trim(),
                            );
                          } else {
                            success = await hr.updateTrainingProgram(
                              id: program['_id'],
                              title: _titleCtrl.text.trim(),
                              description: _descCtrl.text.trim(),
                              category: _category,
                              mode: _mode,
                              trainer: _trainerCtrl.text.trim(),
                              status: status,
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Training details saved!' : 'Failed to save program details.'),
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
                        child: Text(program == null ? 'Add Course Program' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
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

  void _showAssignStaffModal(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    String? selectedEmployeeId = hr.myTeam.isNotEmpty ? hr.myTeam.first.id : null;
    String? selectedProgramId = hr.trainingPrograms.isNotEmpty ? hr.trainingPrograms.first['_id']?.toString() : null;
    
    bool isCustomSyllabus = false;
    final customSyllabusCtrl = TextEditingController();

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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Assign Staff to Training',
                    style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text('Select an employee and choose their training syllabus enrollment.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  const SizedBox(height: 16),

                  // Option to type custom syllabus
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Type a new custom syllabus?',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                      ),
                      Switch(
                        value: isCustomSyllabus,
                        onChanged: (val) {
                          setModalState(() {
                            isCustomSyllabus = val;
                          });
                        },
                        activeColor: const Color(0xFF0284C7),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (isCustomSyllabus) ...[
                    // Custom syllabus text field
                    TextFormField(
                      controller: customSyllabusCtrl,
                      decoration: InputDecoration(
                        labelText: 'Type Syllabus / Course Name',
                        hintText: 'e.g. Advanced Cybersecurity Frameworks',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(Icons.edit_note_rounded, color: Color(0xFF0284C7)),
                      ),
                    ),
                  ] else ...[
                    // Select Program Dropdown
                    DropdownButtonFormField<String>(
                      value: selectedProgramId,
                      decoration: InputDecoration(
                        labelText: 'Select Syllabus / Course',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: hr.trainingPrograms.map((prog) {
                        return DropdownMenuItem(
                          value: prog['_id']?.toString(),
                          child: Text(prog['title']?.toString() ?? '', overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setModalState(() => selectedProgramId = val);
                      },
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Select Employee Dropdown
                  DropdownButtonFormField<String>(
                    value: selectedEmployeeId,
                    decoration: InputDecoration(
                      labelText: 'Select Colleague / Employee',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: hr.myTeam.map((emp) {
                      return DropdownMenuItem(
                        value: emp.id,
                        child: Text('${emp.name} (${emp.positionLevel ?? 'Staff'})', overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setModalState(() => selectedEmployeeId = val);
                    },
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: () async {
                      if (selectedEmployeeId == null) return;
                      
                      String? finalProgramId = selectedProgramId;
                      
                      if (isCustomSyllabus) {
                        final typedTitle = customSyllabusCtrl.text.trim();
                        if (typedTitle.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please type a syllabus name'), backgroundColor: Colors.redAccent),
                          );
                          return;
                        }

                        // Create the training program on the fly
                        final createSuccess = await hr.createTrainingProgram(
                          title: typedTitle,
                          description: 'Custom training course session',
                          category: 'Technical',
                          mode: 'Online',
                          trainer: 'Technical Instructor',
                        );

                        if (!createSuccess) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Failed to initialize custom training program'), backgroundColor: Colors.redAccent),
                            );
                          }
                          return;
                        }

                        // Find the newly created program ID
                        final match = hr.trainingPrograms.firstWhere(
                          (p) => p['title']?.toString().toLowerCase() == typedTitle.toLowerCase(),
                          orElse: () => null,
                        );

                        if (match != null) {
                          finalProgramId = match['_id']?.toString();
                        } else {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Failed to retrieve program ID after creation'), backgroundColor: Colors.redAccent),
                            );
                          }
                          return;
                        }
                      }

                      if (finalProgramId == null) return;

                      final success = await hr.assignEmployeeToTraining(
                        employeeId: selectedEmployeeId!,
                        programId: finalProgramId,
                      );

                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success ? 'Employee assigned successfully!' : 'Failed to assign employee.'),
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
                    child: const Text('Confirm Enrollment', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showEditStatusModal(BuildContext context, Map<String, dynamic> assignment) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    String status = assignment['status']?.toString() ?? 'Assigned';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Update Trainee Status'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: status,
                    decoration: InputDecoration(
                      labelText: 'Syllabus Progress Stage',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Assigned', child: Text('Assigned')),
                      DropdownMenuItem(value: 'In Progress', child: Text('In Progress')),
                      DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => status = val);
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                ),
                TextButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    final success = await hr.updateTrainingAssignmentStatus(
                      id: assignment['_id'],
                      status: status,
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Progress status updated!' : 'Failed to update progress.'),
                          backgroundColor: success ? Colors.green : Colors.redAccent,
                        ),
                      );
                    }
                  },
                  child: const Text('Save Status', style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDeleteAssignment(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Unenroll Employee?'),
          content: const Text('Are you sure you want to remove this employee from this training class?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Keep Enrolled', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteTrainingAssignment(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Employee unenrolled!' : 'Error deleting assignment.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Unenroll', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _confirmDeleteProgram(BuildContext context, String id) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Course Program?'),
          content: const Text('Warning: Deleting this syllabus will also unenroll all assigned employees permanently.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final success = await hr.deleteTrainingProgram(id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Course program deleted!' : 'Error deleting program.'),
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
    final auth = Provider.of<AuthProvider>(context);
    final hr = Provider.of<HrProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    // Fetch employee assignments
    final myEmpId = auth.currentUser?.id;
    final List<dynamic> myAssignments = hr.trainingAssignments.where((a) {
      final emp = a['employee'];
      if (emp is Map) {
        return emp['_id'] == myEmpId;
      }
      return emp == myEmpId;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Learning & Development', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: isAdminOrHr
            ? TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF0284C7),
                unselectedLabelColor: const Color(0xFF64748B),
                indicatorColor: const Color(0xFF0284C7),
                tabs: const [
                  Tab(text: 'Enrollment Roster'),
                  Tab(text: 'Training Courses'),
                ],
              )
            : null,
      ),
      body: !isAdminOrHr
          ? _buildTraineeView(myAssignments, auth.currentUser?.empId ?? '')
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAdminRosterView(hr),
                _buildAdminCoursesView(hr),
              ],
            ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () {
                if (_tabController.index == 0) {
                  _showAssignStaffModal(context);
                } else {
                  _showCreateProgramModal(context);
                }
              },
              backgroundColor: const Color(0xFF0284C7),
              icon: const Icon(Icons.add, color: Colors.white),
              label: Text(_tabController.index == 0 ? 'Enroll Staff' : 'Add Course', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  Widget _buildTraineeView(List<dynamic> list, String empId) {
    if (list.isEmpty) {
      return const Center(
        child: Text('No active training assignments found.', style: TextStyle(color: Color(0xFF64748B))),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final assign = list[index];
        final prog = assign['trainingProgram'] as Map<String, dynamic>? ?? {};
        final title = prog['title']?.toString() ?? 'Security Compliance';
        final desc = prog['description']?.toString() ?? 'Technical training session';
        final status = assign['status']?.toString() ?? 'Ongoing';
        final hasCert = status == 'Completed';

        return Card(
          elevation: 2,
          color: Colors.white,
          shadowColor: const Color(0x100F172A),
          margin: const EdgeInsets.only(bottom: 16),
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
                      child: Text(
                        title,
                        style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: (status == 'Completed' ? const Color(0xFF10B981) : Colors.blueAccent).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: status == 'Completed' ? const Color(0xFF10B981) : Colors.blue[800],
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(desc, style: const TextStyle(color: Color(0xFF475569), fontSize: 13)),
                const Divider(color: Color(0xFFE2E8F0), height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: () => _showFeedbackModal(context, assign['_id']?.toString() ?? ''),
                      icon: const Icon(Icons.rate_review_rounded, size: 16, color: Color(0xFF0284C7)),
                      label: const Text('Feedback', style: TextStyle(color: Color(0xFF0284C7))),
                    ),
                    if (hasCert) ...[
                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Downloading Certificate for Employee: $empId...')),
                          );
                        },
                        icon: const Icon(Icons.workspace_premium_rounded, size: 16),
                        label: const Text('Get Certificate'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      )
                    ]
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAdminRosterView(HrProvider hr) {
    if (hr.trainingAssignments.isEmpty) {
      return const Center(
        child: Text('No active employee training enrollments.', style: TextStyle(color: Color(0xFF64748B))),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: hr.trainingAssignments.length,
      itemBuilder: (context, index) {
        final assign = hr.trainingAssignments[index];
        final emp = assign['employee'] as Map<String, dynamic>? ?? {};
        final prog = assign['trainingProgram'] as Map<String, dynamic>? ?? {};

        final empName = emp['name']?.toString() ?? 'Employee';
        final empDept = emp['department']?.toString() ?? 'General';
        final courseTitle = prog['title']?.toString() ?? 'Unspecified Syllabus';
        final status = assign['status']?.toString() ?? 'Assigned';

        Color statusColor = status == 'Completed' ? const Color(0xFF10B981) : const Color(0xFF0284C7);

        return Card(
          elevation: 2,
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.12), shape: BoxShape.circle),
                  child: Icon(Icons.school_rounded, color: statusColor, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(empName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                      Text('Dept: $empDept', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(
                        'Course: $courseTitle',
                        style: const TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                      child: Text(
                        status,
                        style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 8),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                      onSelected: (val) async {
                        if (val == 'status') {
                          _showEditStatusModal(context, assign);
                        } else if (val == 'delete') {
                          _confirmDeleteAssignment(context, assign['_id']?.toString() ?? '');
                        } else if (val == 'certificate') {
                          _showCertificatePreview(context, assign);
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'status',
                          child: Row(
                            children: [
                              Icon(Icons.edit_note_rounded, size: 18, color: Colors.blue),
                              SizedBox(width: 8),
                              Text('Edit Status'),
                            ],
                          ),
                        ),
                        if (status == 'Completed')
                          const PopupMenuItem(
                            value: 'certificate',
                            child: Row(
                              children: [
                                Icon(Icons.workspace_premium_rounded, size: 18, color: Colors.orange),
                                SizedBox(width: 8),
                                Text('Preview & Send Cert'),
                              ],
                            ),
                          ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                              SizedBox(width: 8),
                              Text('Unenroll Trainee', style: TextStyle(color: Colors.redAccent)),
                            ],
                          ),
                        ),
                      ],
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

  Widget _buildAdminCoursesView(HrProvider hr) {
    if (hr.trainingPrograms.isEmpty) {
      return const Center(
        child: Text('No active training syllabus modules.', style: TextStyle(color: Color(0xFF64748B))),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: hr.trainingPrograms.length,
      itemBuilder: (context, index) {
        final prog = hr.trainingPrograms[index];
        final title = prog['title']?.toString() ?? '';
        final category = prog['category']?.toString() ?? 'General';
        final mode = prog['mode']?.toString() ?? 'Online';
        final trainer = prog['trainer']?.toString() ?? 'Lead Architect';
        final desc = prog['description']?.toString() ?? '';

        return Card(
          elevation: 2,
          color: Colors.white,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(6)),
                      child: Text(
                        category,
                        style: const TextStyle(color: Color(0xFF475569), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 4),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF64748B)),
                      onSelected: (val) {
                        if (val == 'edit') {
                          _showCreateProgramModal(context, program: prog);
                        } else if (val == 'delete') {
                          _confirmDeleteProgram(context, prog['_id']?.toString() ?? '');
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit_rounded, size: 18, color: Colors.blue),
                              SizedBox(width: 8),
                              Text('Edit Course'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_forever_rounded, size: 18, color: Colors.redAccent),
                              SizedBox(width: 8),
                              Text('Delete Course', style: TextStyle(color: Colors.redAccent)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Host: $trainer • Mode: $mode', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                const Divider(color: Color(0xFFE2E8F0), height: 20),
                Text(desc, style: const TextStyle(color: Color(0xFF334155), fontSize: 13)),
              ],
            ),
          ),
        );
      },
    );
  }
}
