import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/asset.dart';

class AssetLogScreen extends StatefulWidget {
  const AssetLogScreen({super.key});

  @override
  State<AssetLogScreen> createState() => _AssetLogScreenState();
}

class _AssetLogScreenState extends State<AssetLogScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hr = Provider.of<HrProvider>(context, listen: false);
      final auth = Provider.of<AuthProvider>(context, listen: false);
      hr.fetchMyAssets();
      hr.fetchMyAssetRequests();
      hr.fetchAssetDamages();
      if (auth.currentUser?.role == 'admin' || auth.currentUser?.role == 'hr') {
        hr.fetchMyTeam();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showRequestHardwareModal(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final assetTypeCtrl = TextEditingController(text: 'Laptop');
    final reasonCtrl = TextEditingController();
    String urgency = 'Normal';

    final typesList = ['Laptop', 'Monitor', 'Mouse & Keyboard', 'iPhone / iPad', 'Headset', 'USB-C Dock', 'Office Chair', 'Other'];

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
                        'Request Company Asset / Hardware',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Submit request for new equipment or hardware replacements:',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),

                      DropdownButtonFormField<String>(
                        initialValue: assetTypeCtrl.text,
                        decoration: InputDecoration(
                          labelText: 'Hardware / Asset Category',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: typesList.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => assetTypeCtrl.text = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        initialValue: urgency,
                        decoration: InputDecoration(
                          labelText: 'Priority / Urgency',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Normal', child: Text('Normal Priority')),
                          DropdownMenuItem(value: 'Urgent', child: Text('Urgent Priority')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => urgency = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: reasonCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Business Justification / Reason',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter reason' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final success = await hr.submitAssetRequest(assetTypeCtrl.text, reasonCtrl.text.trim(), urgency);
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Hardware request submitted to IT team!' : 'Failed to submit request.'),
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
                        child: const Text('Submit Request', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showReportDamageModal(BuildContext context, Asset asset) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Report Damage: ${asset.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Serial No: ${asset.serialNumber}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              const SizedBox(height: 12),
              TextFormField(
                controller: descCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Describe Issue / Physical Damage',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (descCtrl.text.trim().isEmpty) return;
                Navigator.pop(context);
                final success = await hr.reportAssetDamage(asset.id, descCtrl.text.trim());
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success ? 'Damage report sent to IT support!' : 'Failed to submit report.'),
                      backgroundColor: success ? Colors.green : Colors.redAccent,
                    ),
                  );
                  hr.fetchAssetDamages();
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
              child: const Text('Report Issue'),
            ),
          ],
        );
      },
    );
  }

  void _showAddAssetModal(BuildContext context) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final serialCtrl = TextEditingController();
    final valueCtrl = TextEditingController(text: '45000');
    String category = 'Laptops';
    String condition = 'New';
    String? selectedEmpName;

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
                        'Register New Hardware Asset',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Add company device into inventory and assign to staff:',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: nameCtrl,
                        decoration: InputDecoration(
                          labelText: 'Device Name (e.g. MacBook Pro 16)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter device name' : null,
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        initialValue: category,
                        decoration: InputDecoration(
                          labelText: 'Category',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Laptops', child: Text('Laptops')),
                          DropdownMenuItem(value: 'Monitors', child: Text('Monitors')),
                          DropdownMenuItem(value: 'Mobiles', child: Text('Mobiles & Tablets')),
                          DropdownMenuItem(value: 'Accessories', child: Text('Accessories')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => category = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: serialCtrl,
                        decoration: InputDecoration(
                          labelText: 'Serial Number (e.g. SN-AAPL-9081)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter serial number' : null,
                      ),
                      const SizedBox(height: 12),

                      if (hr.myTeam.isNotEmpty) ...[
                        DropdownButtonFormField<String>(
                          initialValue: selectedEmpName,
                          decoration: InputDecoration(
                            labelText: 'Assign to Staff Member',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: hr.myTeam.map((emp) {
                            return DropdownMenuItem(
                              value: emp.name,
                              child: Text('${emp.name} (${emp.empId})'),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setModalState(() => selectedEmpName = val);
                          },
                        ),
                        const SizedBox(height: 12),
                      ],

                      TextFormField(
                        controller: valueCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Purchase Value (₹)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final value = double.tryParse(valueCtrl.text.trim()) ?? 0.0;
                          final success = await hr.createCompanyAsset(
                            name: nameCtrl.text.trim(),
                            category: category,
                            serialNumber: serialCtrl.text.trim(),
                            condition: condition,
                            purchaseValue: value,
                            empName: selectedEmpName,
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'New asset registered in inventory!' : 'Failed to register asset.'),
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
                        child: const Text('Register & Assign Asset', style: TextStyle(fontWeight: FontWeight.bold)),
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

  void _showResolveDamageModal(BuildContext context, AssetDamageModel dmg) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final formKey = GlobalKey<FormState>();
    final costCtrl = TextEditingController(text: dmg.repairCost > 0 ? dmg.repairCost.toStringAsFixed(0) : '3500');
    String paymentMode = dmg.paymentMode.isNotEmpty ? dmg.paymentMode : 'Salary Deduction';
    String status = dmg.status == 'Reported' ? 'Resolved' : dmg.status;

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
                        'Assess & Recover Damage: ${dmg.assetName}',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text('Reported by: ${dmg.employeeName} (${dmg.employeeEmpId})', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: costCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Repair / Replacement Cost (₹)',
                          prefixText: '₹ ',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Please enter cost' : null,
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        initialValue: paymentMode,
                        decoration: InputDecoration(
                          labelText: 'Payment / Recovery Mode',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Salary Deduction', child: Text('Salary Deduction (Auto Monthly Payroll)')),
                          DropdownMenuItem(value: 'Lump Sum Payment', child: Text('Lump Sum Payment (Direct/Online Pay)')),
                          DropdownMenuItem(value: 'Company Covered', child: Text('Company Covered (Waived / Warranty)')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => paymentMode = val);
                        },
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        initialValue: status,
                        decoration: InputDecoration(
                          labelText: 'Resolution Status',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'In Repair', child: Text('In Repair')),
                          DropdownMenuItem(value: 'Resolved', child: Text('Resolved & Closed')),
                        ],
                        onChanged: (val) {
                          if (val != null) setModalState(() => status = val);
                        },
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;
                          final cost = double.tryParse(costCtrl.text.trim()) ?? 0.0;
                          final success = await hr.resolveAssetDamage(
                            damageId: dmg.id,
                            repairCost: cost,
                            paymentMode: paymentMode,
                            status: status,
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Damage recovery updated successfully!' : 'Failed to update recovery.'),
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
                        child: const Text('Save Settlement & Update Status', style: TextStyle(fontWeight: FontWeight.bold)),
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Asset Log & IT Inventory', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0284C7),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF0284C7),
          tabs: const [
            Tab(text: 'My Assets'),
            Tab(text: 'Hardware Requests'),
            Tab(text: 'Damage & Recovery'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Assigned Assets
          hr.isLoading && hr.myAssets.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : hr.myAssets.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.devices_rounded, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 12),
                          Text('No hardware assets assigned to your profile.', style: TextStyle(color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: hr.myAssets.length,
                      itemBuilder: (context, index) {
                        final asset = hr.myAssets[index];
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
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: const BoxDecoration(color: Color(0xFFE0F2FE), shape: BoxShape.circle),
                                      child: const Icon(Icons.laptop_mac_rounded, color: Color(0xFF0284C7)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(asset.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                                          Text('SN: ${asset.serialNumber}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                          if (asset.assignedToName != null && asset.assignedToName!.isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              'Assigned to: ${asset.assignedToName}${asset.assignedToEmpId != null ? ' (${asset.assignedToEmpId})' : ''}',
                                              style: const TextStyle(color: Color(0xFF0284C7), fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(asset.status, style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const Divider(color: Color(0xFFE2E8F0), height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Category: ${asset.category}', style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
                                    Text('Condition: ${asset.condition}', style: const TextStyle(color: Color(0xFF475569), fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    onPressed: () => _showReportDamageModal(context, asset),
                                    icon: const Icon(Icons.report_problem_rounded, size: 14, color: Color(0xFFEF4444)),
                                    label: const Text('Report Damage', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

          // Tab 2: Hardware Requests
          hr.isLoading && hr.myAssetRequests.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : hr.myAssetRequests.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.assignment_turned_in_rounded, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 12),
                          Text('No hardware requests filed.', style: TextStyle(color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: hr.myAssetRequests.length,
                      itemBuilder: (context, index) {
                        final req = hr.myAssetRequests[index];
                        final isPending = req.status.toLowerCase() == 'pending';
                        final isApproved = req.status.toLowerCase() == 'approved' || req.status.toLowerCase() == 'fulfilled';

                        return Card(
                          elevation: 2,
                          color: Colors.white,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
                                      child: const Icon(Icons.build_circle_rounded, color: Color(0xFF0284C7)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('${req.assetType} Request', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                                          if (req.employeeName.isNotEmpty && req.employeeName != 'Unknown')
                                            Text('Requested by: ${req.employeeName} (${req.employeeEmpId})', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: (isApproved ? const Color(0xFF10B981) : (isPending ? Colors.amber : Colors.red)).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        req.status,
                                        style: TextStyle(
                                          color: isApproved ? const Color(0xFF10B981) : (isPending ? Colors.amber[800] : Colors.red),
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(color: Color(0xFFE2E8F0), height: 24),
                                Text('Reason: ${req.reason}', style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),

                                if (isAdminOrHr && isPending) ...[
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () async {
                                            final success = await hr.resolveAssetRequestStatus(req.id, 'Approved');
                                            if (context.mounted && success) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Hardware request approved!'), backgroundColor: Colors.green),
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
                                            final success = await hr.resolveAssetRequestStatus(req.id, 'Rejected');
                                            if (context.mounted && success) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Hardware request rejected!'), backgroundColor: Colors.redAccent),
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

          // Tab 3: Damage & Recovery
          hr.isLoading && hr.assetDamages.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : hr.assetDamages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.report_problem_rounded, size: 48, color: Color(0xFF94A3B8)),
                          SizedBox(height: 12),
                          Text('No asset damages reported.', style: TextStyle(color: Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: hr.assetDamages.length,
                      itemBuilder: (context, index) {
                        final dmg = hr.assetDamages[index];
                        final isResolved = dmg.status.toLowerCase() == 'resolved';

                        return Card(
                          elevation: 2,
                          color: Colors.white,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: const BoxDecoration(color: Color(0xFFFEE2E2), shape: BoxShape.circle),
                                      child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(dmg.assetName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                                          Text('Reported by: ${dmg.employeeName} (${dmg.employeeEmpId})', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: (isResolved ? const Color(0xFF10B981) : Colors.red).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        dmg.status,
                                        style: TextStyle(
                                          color: isResolved ? const Color(0xFF10B981) : Colors.red,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(color: Color(0xFFE2E8F0), height: 24),
                                Text('Issue Description: ${dmg.description}', style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
                                const SizedBox(height: 8),

                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Repair Cost:', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                          Text(
                                            dmg.repairCost > 0 ? '₹${dmg.repairCost.toStringAsFixed(0)}' : 'Pending Assessment',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Recovery Mode:', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                          Text(
                                            dmg.paymentMode,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0284C7)),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),

                                if (isAdminOrHr && !isResolved) ...[
                                  const SizedBox(height: 12),
                                  ElevatedButton.icon(
                                    onPressed: () => _showResolveDamageModal(context, dmg),
                                    icon: const Icon(Icons.handshake_rounded, size: 16, color: Colors.white),
                                    label: const Text('Set Repair Cost & Recovery Mode', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0284C7),
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ],
      ),
      floatingActionButton: _buildFAB(context, isAdminOrHr),
    );
  }

  Widget? _buildFAB(BuildContext context, bool isAdminOrHr) {
    if (_tabController.index == 0) {
      if (isAdminOrHr) {
        return FloatingActionButton.extended(
          onPressed: () => _showAddAssetModal(context),
          backgroundColor: const Color(0xFF0284C7),
          icon: const Icon(Icons.add_to_photos_rounded, color: Colors.white),
          label: const Text('Add New Asset', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        );
      }
    } else if (_tabController.index == 1) {
      if (!isAdminOrHr) {
        return FloatingActionButton.extended(
          onPressed: () => _showRequestHardwareModal(context),
          backgroundColor: const Color(0xFF0284C7),
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text('Request Hardware', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        );
      }
    }
    return null;
  }
}
