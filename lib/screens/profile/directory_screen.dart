import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/app_user.dart';

class DirectoryScreen extends StatefulWidget {
  const DirectoryScreen({super.key});

  @override
  State<DirectoryScreen> createState() => _DirectoryScreenState();
}

class _DirectoryScreenState extends State<DirectoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchMyTeam();
    });
  }

  Future<void> _launchCall(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    final Uri url = Uri.parse('tel:${phone.trim()}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  Future<void> _launchEmail(String? email) async {
    if (email == null || email.trim().isEmpty) return;
    final Uri url = Uri.parse('mailto:${email.trim()}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  Future<void> _launchWhatsApp(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    // Clean phone number from spaces/symbols
    final cleanPhone = phone.replaceAll(RegExp(r'\s+|-|\+'), '');
    final Uri url = Uri.parse('https://wa.me/$cleanPhone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Teammate Directory', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.myTeam.isEmpty
          ? const Center(
              child: Text(
                'No directory records synced.',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: hr.myTeam.length,
              itemBuilder: (context, index) {
                final member = hr.myTeam[index];
                
                return Card(
                  elevation: 2,
                  color: Colors.white,
                  shadowColor: const Color(0x100F172A),
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: isAdminOrHr
                        ? () => _showEmployeeActionOptionsSheet(context, member)
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: const Color(0xFFF1F5F9), // Slate 100
                          child: Text(
                            member.name.isNotEmpty ? member.name.substring(0, 1).toUpperCase() : '?',
                            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                        ),
                        const SizedBox(width: 16),
                        
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                member.name,
                                style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${member.positionLevel ?? 'Professional'} • ${member.department ?? 'General'}',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                member.email,
                                style: const TextStyle(color: Color(0xFF475569), fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        // Launcher Actions Group
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (member.phone != null && member.phone!.trim().isNotEmpty) ...[
                              IconButton(
                                icon: const Icon(Icons.phone_rounded, color: Color(0xFF10B981), size: 20),
                                onPressed: () => _launchCall(member.phone),
                              ),
                              IconButton(
                                icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366), size: 20),
                                onPressed: () => _launchWhatsApp(member.phone),
                              ),
                            ],
                            IconButton(
                              icon: const Icon(Icons.email_rounded, color: Color(0xFF2563EB), size: 20),
                              onPressed: () => _launchEmail(member.email),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
            ),
      floatingActionButton: isAdminOrHr
          ? FloatingActionButton.extended(
              onPressed: () => _showAddEmployeeModal(context),
              backgroundColor: const Color(0xFF2563EB),
              icon: const Icon(Icons.person_add_rounded, color: Colors.white),
              label: const Text('Add Employee', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  void _showAddEmployeeModal(BuildContext context) {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final designationCtrl = TextEditingController(text: 'Software Engineer');
    final salaryCtrl = TextEditingController(text: '60000');
    final passwordCtrl = TextEditingController(text: 'password123');
    final driveLinkCtrl = TextEditingController();
    final panCtrl = TextEditingController();
    String selectedDept = 'Engineering';
    final depts = ['Engineering', 'HR', 'Marketing', 'Sales', 'Design', 'Product'];
    final formKey = GlobalKey<FormState>();
    final designationsList = [
      'Software Engineer',
      'Intern',
      'Student',
      'Internship Trainee',
      'HR Manager',
      'Project Manager',
      'Sales Representative',
      'Marketing Specialist',
      'Designer',
    ];

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
                        'Onboard New Employee',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: nameCtrl,
                        decoration: InputDecoration(
                          labelText: 'Full Name',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'Work Email Address',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: phoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: InputDecoration(
                                labelText: 'Phone Number',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedDept,
                              decoration: InputDecoration(
                                labelText: 'Department',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              items: depts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                              onChanged: (val) {
                                if (val != null) setModalState(() => selectedDept = val);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Autocomplete<String>(
                              optionsBuilder: (TextEditingValue textEditingValue) {
                                if (textEditingValue.text.isEmpty) {
                                  return designationsList;
                                }
                                return designationsList.where((String option) {
                                  return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
                                });
                              },
                              onSelected: (String selection) {
                                designationCtrl.text = selection;
                              },
                              fieldViewBuilder: (BuildContext context, TextEditingController textEditingController, FocusNode focusNode, VoidCallback onFieldSubmitted) {
                                if (textEditingController.text.isEmpty && designationCtrl.text.isNotEmpty) {
                                  textEditingController.text = designationCtrl.text;
                                }
                                textEditingController.addListener(() {
                                  designationCtrl.text = textEditingController.text;
                                });
                                return TextFormField(
                                  controller: textEditingController,
                                  focusNode: focusNode,
                                  decoration: InputDecoration(
                                    labelText: 'Designation / Role',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: salaryCtrl,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: 'Base Salary (₹)',
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
                              controller: panCtrl,
                              decoration: InputDecoration(
                                labelText: 'PAN Number (Optional)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: passwordCtrl,
                              obscureText: true,
                              decoration: InputDecoration(
                                labelText: 'Initial Account Password',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: driveLinkCtrl,
                        keyboardType: TextInputType.url,
                        decoration: InputDecoration(
                          labelText: 'Google Drive / Cloud Documents Link (Optional)',
                          hintText: 'https://drive.google.com/drive/folders/...',
                          prefixIcon: const Icon(Icons.cloud_upload_rounded, color: Color(0xFF2563EB)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          final success = await hr.createEmployee(
                            name: nameCtrl.text.trim(),
                            email: emailCtrl.text.trim(),
                            phone: phoneCtrl.text.trim(),
                            department: selectedDept,
                            positionLevel: designationCtrl.text.trim(),
                            baseSalary: double.tryParse(salaryCtrl.text) ?? 60000,
                            password: passwordCtrl.text,
                            panNumber: panCtrl.text.trim().isEmpty ? null : panCtrl.text.trim(),
                            documentsLink: driveLinkCtrl.text.trim().isEmpty ? null : driveLinkCtrl.text.trim(),
                          );

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Employee onboarded successfully!' : 'Failed to onboard employee.'),
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
                        child: const Text('Add & Onboard Employee', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showEmployeeActionOptionsSheet(BuildContext context, AppUser employee) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Actions for ${employee.name}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'ID: ${employee.empId ?? 'N/A'} • ${employee.positionLevel ?? 'Staff'}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.trending_up_rounded, color: Color(0xFF10B981)),
                title: const Text('Promote Employee', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Change designation and adjust salary logs'),
                onTap: () {
                  Navigator.pop(context);
                  _showPromoteModal(context, employee);
                },
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              ListTile(
                leading: const Icon(Icons.swap_horiz_rounded, color: Color(0xFF2563EB)),
                title: const Text('Transfer / Relocate', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Transfer to another department or work location'),
                onTap: () {
                  Navigator.pop(context);
                  _showTransferModal(context, employee);
                },
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              ListTile(
                leading: const Icon(Icons.no_accounts_rounded, color: Color(0xFFEF4444)),
                title: const Text('Offboard Staff', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFEF4444))),
                subtitle: const Text('Initiate FNF, log exit interviews and deactivate profile'),
                onTap: () {
                  Navigator.pop(context);
                  _showOffboardModal(context, employee);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  void _showPromoteModal(BuildContext context, AppUser employee) {
    final formKey = GlobalKey<FormState>();
    final roleCtrl = TextEditingController(text: employee.positionLevel);
    final salaryCtrl = TextEditingController(text: '65000');
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().split('T')[0]);
    final notesCtrl = TextEditingController();

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
                        '📈 Promote Employee',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: roleCtrl,
                        decoration: InputDecoration(
                          labelText: 'New Designation / Role',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: salaryCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'New Base Salary (₹)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: dateCtrl,
                        decoration: InputDecoration(
                          labelText: 'Effective Date',
                          hintText: 'YYYY-MM-DD',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: notesCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Promotion Notes',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          final success = await hr.promoteEmployee(
                            employeeId: employee.id,
                            newRole: roleCtrl.text.trim(),
                            newSalary: double.tryParse(salaryCtrl.text) ?? 65000,
                            effectiveDate: dateCtrl.text.trim(),
                            notes: notesCtrl.text.trim(),
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Employee promoted successfully!' : 'Failed to promote employee.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Confirm Promotion', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showTransferModal(BuildContext context, AppUser employee) {
    final formKey = GlobalKey<FormState>();
    String selectedDept = employee.department ?? 'Engineering';
    String selectedLoc = 'Office';
    final depts = ['Engineering', 'HR', 'Marketing', 'Sales', 'Design', 'Product'];
    final locs = ['Office', 'Remote', 'Hybrid'];
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().split('T')[0]);
    final notesCtrl = TextEditingController();

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
                        '🔄 Transfer / Relocate Employee',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: depts.contains(selectedDept) ? selectedDept : depts.first,
                        decoration: InputDecoration(
                          labelText: 'New Department',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: depts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedDept = val);
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedLoc,
                        decoration: InputDecoration(
                          labelText: 'New Work Location',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: locs.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedLoc = val);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: dateCtrl,
                        decoration: InputDecoration(
                          labelText: 'Effective Date',
                          hintText: 'YYYY-MM-DD',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: notesCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Transfer Notes',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          final success = await hr.transferEmployee(
                            employeeId: employee.id,
                            newDepartment: selectedDept,
                            newWorkLocation: selectedLoc,
                            effectiveDate: dateCtrl.text.trim(),
                            notes: notesCtrl.text.trim(),
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Employee transferred successfully!' : 'Failed to transfer employee.'),
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
                        child: const Text('Confirm Transfer', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showOffboardModal(BuildContext context, AppUser employee) {
    final formKey = GlobalKey<FormState>();
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().split('T')[0]);
    final reasonCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    final interviewCtrl = TextEditingController();
    bool initiateFnf = true;

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
                        '❌ Offboard Employee',
                        style: TextStyle(color: Color(0xFFEF4444), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: dateCtrl,
                        decoration: InputDecoration(
                          labelText: 'Exit Date',
                          hintText: 'YYYY-MM-DD',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: reasonCtrl,
                        decoration: InputDecoration(
                          labelText: 'Exit Reason (e.g. Resignation, Terminated)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: notesCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Exit Notes',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: interviewCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Exit Interview Comments',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile(
                        title: const Text('Initiate Full & Final (FNF)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        value: initiateFnf,
                        activeColor: const Color(0xFFEF4444),
                        onChanged: (v) => setModalState(() => initiateFnf = v),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          final success = await hr.offboardEmployee(
                            employeeId: employee.id,
                            exitDate: dateCtrl.text.trim(),
                            exitReason: reasonCtrl.text.trim(),
                            exitNotes: notesCtrl.text.trim(),
                            exitInterviewNotes: interviewCtrl.text.trim(),
                            initiateFnf: initiateFnf,
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Employee offboarded successfully!' : 'Failed to offboard employee.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Confirm Offboarding', style: TextStyle(fontWeight: FontWeight.bold)),
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
}
