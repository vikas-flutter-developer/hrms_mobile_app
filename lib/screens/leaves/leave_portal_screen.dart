import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/leave.dart';

class LeavePortalScreen extends StatefulWidget {
  const LeavePortalScreen({super.key});

  @override
  State<LeavePortalScreen> createState() => _LeavePortalScreenState();
}

class _LeavePortalScreenState extends State<LeavePortalScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _startDateCtrl = TextEditingController();
  final _endDateCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  String _selectedType = 'Casual';
  String _staffFilter = 'All';

  final List<String> _leaveTypes = ['Casual', 'Medical', 'Paid', 'Resignation'];

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      hr.fetchHolidays();
      if (isAdminOrHr) {
        hr.fetchStaffLeaveRequests();
      } else {
        hr.fetchLeaveRequests();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _startDateCtrl.dispose();
    _endDateCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context, TextEditingController controller) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFF43F5E),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        controller.text = picked.toIso8601String().split('T')[0];
      });
    }
  }

  int _calculateDays(String start, String end) {
    if (start.isEmpty || end.isEmpty) return 0;
    try {
      final sDate = DateTime.parse(start);
      final eDate = DateTime.parse(end);
      final diff = eDate.difference(sDate).inDays + 1;
      return diff > 0 ? diff : 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> _submitLeave() async {
    if (!_formKey.currentState!.validate()) return;
    
    final days = _calculateDays(_startDateCtrl.text, _endDateCtrl.text);
    if (days <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End date must be on or after start date.')),
      );
      return;
    }

    final hr = Provider.of<HrProvider>(context, listen: false);
    final success = await hr.applyLeave(
      _selectedType,
      _startDateCtrl.text,
      _endDateCtrl.text,
      days,
      _reasonCtrl.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leave applied successfully!'), backgroundColor: Colors.green),
      );
      _startDateCtrl.clear();
      _endDateCtrl.clear();
      _reasonCtrl.clear();
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(hr.errorMessage ?? 'Failed to apply leave.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showApplyModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
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
                      const Text(
                        'Request Time Off',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      
                      // Type select dropdown
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedType,
                            dropdownColor: Colors.white,
                            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16),
                            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF64748B)),
                            isExpanded: true,
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                setModalState(() {
                                  _selectedType = newValue;
                                });
                                setState(() {
                                  _selectedType = newValue;
                                });
                              }
                            },
                            items: _leaveTypes.map<DropdownMenuItem<String>>((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Start Date
                      TextFormField(
                        controller: _startDateCtrl,
                        readOnly: true,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Start Date',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          prefixIcon: const Icon(Icons.date_range_rounded, color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        onTap: () async {
                          await _selectDate(context, _startDateCtrl);
                          setModalState(() {});
                        },
                        validator: (value) => value == null || value.isEmpty ? 'Select start date' : null,
                      ),
                      const SizedBox(height: 16),

                      // End Date
                      TextFormField(
                        controller: _endDateCtrl,
                        readOnly: true,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'End Date',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          prefixIcon: const Icon(Icons.date_range_rounded, color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        onTap: () async {
                          await _selectDate(context, _endDateCtrl);
                          setModalState(() {});
                        },
                        validator: (value) => value == null || value.isEmpty ? 'Select end date' : null,
                      ),
                      const SizedBox(height: 16),

                      // Reason
                      TextFormField(
                        controller: _reasonCtrl,
                        maxLines: 3,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Reason Statement',
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
                        onPressed: _submitLeave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF43F5E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Apply Request', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showHolidayModal(BuildContext context, {Holiday? holiday}) {
    final isEdit = holiday != null;
    final nameCtrl = TextEditingController(text: holiday?.name ?? '');
    final dateCtrl = TextEditingController(text: holiday?.date ?? '');
    final descCtrl = TextEditingController(text: holiday?.description ?? '');
    String holidayType = holiday?.type ?? 'National';
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
                      Text(
                        isEdit ? 'Edit Holiday' : 'Add New Holiday',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Name input
                      TextFormField(
                        controller: nameCtrl,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Holiday Name',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Enter holiday name' : null,
                      ),
                      const SizedBox(height: 16),

                      // Date select field
                      TextFormField(
                        controller: dateCtrl,
                        readOnly: true,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Holiday Date',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          prefixIcon: const Icon(Icons.date_range_rounded, color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        onTap: () async {
                          final DateTime? picked = await showDatePicker(
                            context: context,
                            initialDate: DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2030),
                          );
                          if (picked != null) {
                            setModalState(() {
                              dateCtrl.text = picked.toIso8601String().split('T')[0];
                            });
                          }
                        },
                        validator: (value) => value == null || value.isEmpty ? 'Select holiday date' : null,
                      ),
                      const SizedBox(height: 16),

                      // Type select dropdown
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: holidayType,
                            dropdownColor: Colors.white,
                            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16),
                            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF64748B)),
                            isExpanded: true,
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                setModalState(() {
                                  holidayType = newValue;
                                });
                              }
                            },
                            items: <String>['National', 'Optional', 'Regional'].map<DropdownMenuItem<String>>((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Description
                      TextFormField(
                        controller: descCtrl,
                        maxLines: 2,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Description',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          bool success;
                          if (isEdit) {
                            success = await hr.updateHoliday(
                              holiday.id,
                              nameCtrl.text.trim(),
                              dateCtrl.text,
                              holidayType,
                              descCtrl.text.trim(),
                            );
                          } else {
                            success = await hr.addHoliday(
                              nameCtrl.text.trim(),
                              dateCtrl.text,
                              holidayType,
                              descCtrl.text.trim(),
                            );
                          }

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success 
                                  ? (isEdit ? 'Holiday updated successfully!' : 'Holiday added successfully!') 
                                  : 'Failed to process request.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF43F5E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(isEdit ? 'Update Holiday' : 'Save Holiday', style: const TextStyle(fontWeight: FontWeight.bold)),
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

  void _confirmDeleteHoliday(BuildContext context, Holiday holiday) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Holiday'),
          content: Text('Are you sure you want to delete "${holiday.name}"?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final hr = Provider.of<HrProvider>(context, listen: false);
                final success = await hr.deleteHoliday(holiday.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Holiday deleted successfully!' : 'Failed to delete holiday.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  void _showEditLeaveModal(BuildContext context, LeaveRequest req) {
    String selectedType = _leaveTypes.contains(req.type) ? req.type : 'Casual';
    final startCtrl = TextEditingController(text: req.startDate);
    final endCtrl = TextEditingController(text: req.endDate);
    final reasonCtrl = TextEditingController(text: req.reason);
    final daysCtrl = TextEditingController(text: req.days.toString());
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
                        'Edit Leave Request',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Leave Type Dropdown
                      DropdownButtonFormField<String>(
                        initialValue: selectedType,
                        decoration: InputDecoration(
                          labelText: 'Leave Type',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _leaveTypes.map((type) {
                          return DropdownMenuItem(value: type, child: Text(type));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedType = val);
                        },
                      ),
                      const SizedBox(height: 16),

                      // Dates Row
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: startCtrl,
                              readOnly: true,
                              decoration: InputDecoration(
                                labelText: 'Start Date',
                                prefixIcon: const Icon(Icons.date_range),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime.tryParse(req.startDate) ?? DateTime.now(),
                                  firstDate: DateTime(2024),
                                  lastDate: DateTime(2030),
                                );
                                if (picked != null) {
                                  setModalState(() {
                                    startCtrl.text = picked.toIso8601String().split('T')[0];
                                  });
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: endCtrl,
                              readOnly: true,
                              decoration: InputDecoration(
                                labelText: 'End Date',
                                prefixIcon: const Icon(Icons.date_range),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime.tryParse(req.endDate) ?? DateTime.now(),
                                  firstDate: DateTime(2024),
                                  lastDate: DateTime(2030),
                                );
                                if (picked != null) {
                                  setModalState(() {
                                    endCtrl.text = picked.toIso8601String().split('T')[0];
                                  });
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Days
                      TextFormField(
                        controller: daysCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Days Count',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Reason
                      TextFormField(
                        controller: reasonCtrl,
                        maxLines: 2,
                        decoration: InputDecoration(
                          labelText: 'Reason',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final hr = Provider.of<HrProvider>(context, listen: false);
                          final days = int.tryParse(daysCtrl.text) ?? req.days;

                          final success = await hr.editLeaveRequest(
                            req.id,
                            selectedType,
                            startCtrl.text,
                            endCtrl.text,
                            days,
                            reasonCtrl.text.trim(),
                          );

                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Leave request updated!' : 'Failed to update leave request.'),
                                backgroundColor: success ? Colors.green : Colors.redAccent,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF43F5E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Update Leave Request', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _confirmDeleteLeave(BuildContext context, LeaveRequest req) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Leave Request'),
          content: Text('Are you sure you want to delete this ${req.type} leave request?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                final hr = Provider.of<HrProvider>(context, listen: false);
                final success = await hr.deleteLeaveRequest(req.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Leave request deleted successfully!' : 'Failed to delete leave request.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                }
              },
              child: const Text('Delete', style: TextStyle(color: Colors.red)),
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
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Leave Portal', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFF43F5E),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFFF43F5E),
          tabs: isAdminOrHr
              ? const [
                  Tab(text: 'Staff Approvals'),
                  Tab(text: 'Company Holidays'),
                ]
              : const [
                  Tab(text: 'Balances & History'),
                  Tab(text: 'Company Holidays'),
                ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: isAdminOrHr
            ? [
                _buildStaffApprovalsTab(hr),
                _buildHolidaysTab(hr),
              ]
            : [
                _buildBalancesTab(hr),
                _buildHolidaysTab(hr),
              ],
      ),
      floatingActionButton: _buildFab(isAdminOrHr),
    );
  }

  Widget? _buildFab(bool isAdminOrHr) {
    if (isAdminOrHr) {
      if (_tabController.index == 1) {
        return FloatingActionButton.extended(
          onPressed: () => _showHolidayModal(context),
          backgroundColor: const Color(0xFFF43F5E),
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text('Add Holiday', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        );
      }
      return null;
    } else {
      if (_tabController.index == 0) {
        return FloatingActionButton(
          onPressed: () => _showApplyModal(context),
          backgroundColor: const Color(0xFFF43F5E),
          child: const Icon(Icons.add, color: Colors.white),
        );
      }
      return null;
    }
  }

  Widget _buildStaffApprovalsTab(HrProvider hr) {
    if (hr.isLoading && hr.staffLeaveRequests.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final allStaff = hr.staffLeaveRequests;
    final pendingCount = allStaff.where((r) => r.status.toLowerCase() == 'pending').length;
    final approvedCount = allStaff.where((r) => r.status.toLowerCase() == 'approved').length;
    final rejectedCount = allStaff.where((r) => r.status.toLowerCase() == 'rejected').length;

    List<LeaveRequest> filtered = allStaff;
    if (_staffFilter == 'Pending') {
      filtered = allStaff.where((r) => r.status.toLowerCase() == 'pending').toList();
    } else if (_staffFilter == 'Approved') {
      filtered = allStaff.where((r) => r.status.toLowerCase() == 'approved').toList();
    } else if (_staffFilter == 'Rejected') {
      filtered = allStaff.where((r) => r.status.toLowerCase() == 'rejected').toList();
    }

    return RefreshIndicator(
      onRefresh: () => hr.fetchStaffLeaveRequests(),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Count Summary Row
            Row(
              children: [
                _buildCountCard('Pending', pendingCount, Colors.amber[800]!),
                const SizedBox(width: 10),
                _buildCountCard('Approved', approvedCount, const Color(0xFF10B981)),
                const SizedBox(width: 10),
                _buildCountCard('Rejected', rejectedCount, const Color(0xFFEF4444)),
              ],
            ),
            const SizedBox(height: 16),

            // Filter Chips Row
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Pending', 'Approved', 'Rejected'].map((filter) {
                  final isSelected = _staffFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: isSelected,
                      selectedColor: const Color(0xFFF43F5E),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : const Color(0xFF0F172A),
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      backgroundColor: Colors.white,
                      onSelected: (val) {
                        if (val) setState(() => _staffFilter = filter);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Staff Requests List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox_rounded, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            'No $_staffFilter staff leave requests.',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      itemCount: filtered.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final req = filtered[index];
                        final isPending = req.status.toLowerCase() == 'pending';

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x050F172A),
                                blurRadius: 6,
                                offset: Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Top Row: Employee Name + Status Badge
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 18,
                                          backgroundColor: const Color(0xFFF1F5F9),
                                          child: Text(
                                            req.employeeName.isNotEmpty ? req.employeeName[0].toUpperCase() : 'E',
                                            style: const TextStyle(color: Color(0xFFF43F5E), fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                req.employeeName,
                                                style: const TextStyle(
                                                  color: Color(0xFF0F172A),
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 15,
                                                ),
                                              ),
                                              Text(
                                                'ID: ${req.employeeEmpId}',
                                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _buildStatusBadge(req.status, req.isLOP),
                                      const SizedBox(width: 4),
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined, color: Color(0xFF2563EB), size: 18),
                                        onPressed: () => _showEditLeaveModal(context, req),
                                        padding: const EdgeInsets.all(4),
                                        constraints: const BoxConstraints(),
                                      ),
                                      const SizedBox(width: 4),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                                        onPressed: () => _confirmDeleteLeave(context, req),
                                        padding: const EdgeInsets.all(4),
                                        constraints: const BoxConstraints(),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const Divider(height: 24, color: Color(0xFFF1F5F9)),

                              // Leave Details
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF1F2),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${req.type} (${req.days} days)',
                                      style: const TextStyle(
                                        color: Color(0xFFF43F5E),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      '${req.startDate} to ${req.endDate}',
                                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              // Reason
                              Text(
                                req.reason.isNotEmpty ? req.reason : 'No statement provided.',
                                style: const TextStyle(color: Color(0xFF334155), fontSize: 13),
                              ),

                              // Approve / Reject Action Buttons for Pending Requests
                              if (isPending) ...[
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: () async {
                                          final success = await hr.resolveStaffLeaveRequest(req.id, 'Rejected');
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(success ? 'Leave request rejected.' : 'Action failed.'),
                                                backgroundColor: success ? Colors.orange : Colors.redAccent,
                                              ),
                                            );
                                          }
                                        },
                                        icon: const Icon(Icons.cancel_outlined, size: 18, color: Color(0xFFEF4444)),
                                        label: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(color: Color(0xFFFECDD3)),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () async {
                                          final success = await hr.resolveStaffLeaveRequest(req.id, 'Approved');
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(success ? 'Leave request approved!' : 'Action failed.'),
                                                backgroundColor: success ? Colors.green : Colors.redAccent,
                                              ),
                                            );
                                          }
                                        },
                                        icon: const Icon(Icons.check_circle_outline, size: 18, color: Colors.white),
                                        label: const Text('Approve', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF10B981),
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountCard(String title, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBalancesTab(HrProvider hr) {
    if (hr.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final bal = hr.leaveBalances;
    final history = hr.myLeaveRequests;

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Balances Row
          Row(
            children: [
              _buildQuotaCard('Casual', bal?.casual ?? 0, Colors.blue),
              const SizedBox(width: 10),
              _buildQuotaCard('Medical', bal?.medical ?? 0, Colors.green[700]!),
              const SizedBox(width: 10),
              _buildQuotaCard('Paid', bal?.paid ?? 0, Colors.purple[700]!),
            ],
          ),
          const SizedBox(height: 20),

          // History Log title
          const Text(
            'Leave Application History',
            style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: Card(
              elevation: 2,
              color: Colors.white,
              shadowColor: const Color(0x100F172A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: history.isEmpty
                  ? const Center(child: Text('No leaves requested.', style: TextStyle(color: Color(0xFF64748B))))
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: history.length,
                      separatorBuilder: (context, index) => const Divider(color: Color(0xFFE2E8F0)),
                      itemBuilder: (context, index) {
                        final req = history[index];
                        final timeline = '${req.startDate} to ${req.endDate}';

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            '${req.type.toString().toLowerCase().endsWith('leave') ? req.type : '${req.type} Leave'} (${req.days} days)',
                            style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(timeline, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                              const SizedBox(height: 2),
                              Text(req.reason, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildStatusBadge(req.status, req.isLOP),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, color: Color(0xFF2563EB), size: 18),
                                onPressed: () => _showEditLeaveModal(context, req),
                                padding: const EdgeInsets.all(4),
                                constraints: const BoxConstraints(),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                                onPressed: () => _confirmDeleteLeave(context, req),
                                padding: const EdgeInsets.all(4),
                                constraints: const BoxConstraints(),
                              ),
                            ],
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

  Widget _buildQuotaCard(String title, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x050F172A),
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHolidaysTab(HrProvider hr) {
    final list = hr.holidays;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isAdminOrHr = auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr';

    if (list.isEmpty) {
      return const Center(child: Text('No holidays listed.', style: TextStyle(color: Color(0xFF64748B))));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (context, index) => const Divider(color: Color(0xFFE2E8F0)),
      itemBuilder: (context, index) {
        final hol = list[index];
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
            child: const Icon(Icons.celebration_rounded, color: Color(0xFFF43F5E)),
          ),
          title: Text(hol.name, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14)),
          subtitle: Text(hol.description.isNotEmpty ? hol.description : 'Official Holiday', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                hol.date,
                style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 12),
              ),
              if (isAdminOrHr) ...[
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.edit_rounded, color: Color(0xFF2563EB), size: 18),
                  onPressed: () => _showHolidayModal(context, holiday: hol),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.delete_rounded, color: Color(0xFFEF4444), size: 18),
                  onPressed: () => _confirmDeleteHoliday(context, hol),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatusBadge(String status, bool isLOP) {
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
      default:
        color = Colors.blueGrey;
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
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
        ),
        if (isLOP) ...[
          const SizedBox(height: 4),
          const Text(
            'Loss of Pay (LOP)',
            style: TextStyle(color: Color(0xFFEF4444), fontSize: 9, fontWeight: FontWeight.bold),
          )
        ],
      ],
    );
  }
}
