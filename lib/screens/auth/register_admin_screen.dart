import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class RegisterAdminScreen extends StatefulWidget {
  const RegisterAdminScreen({super.key});

  @override
  State<RegisterAdminScreen> createState() => _RegisterAdminScreenState();
}

class _RegisterAdminScreenState extends State<RegisterAdminScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _branchCtrl = TextEditingController();
  final _regCtrl = TextEditingController();
  final _panCtrl = TextEditingController();
  final _tanCtrl = TextEditingController();
  final _gstCtrl = TextEditingController();
  
  String _selectedPlan = 'Basic';
  int _selectedDuration = 1; // months
  bool _obscurePassword = true;

  final List<String> _plans = ['Free', 'Basic', 'Premium', 'Enterprise'];
  final List<int> _durations = [1, 3, 6, 12];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _phoneCtrl.dispose();
    _companyCtrl.dispose();
    _branchCtrl.dispose();
    _regCtrl.dispose();
    _panCtrl.dispose();
    _tanCtrl.dispose();
    _gstCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final data = {
      'adminId': 'admin_${DateTime.now().millisecondsSinceEpoch}',
      'name': _nameCtrl.text.trim(),
      'email': _emailCtrl.text.trim(),
      'password': _passCtrl.text,
      'phone': _phoneCtrl.text.trim(),
      'companyName': _companyCtrl.text.trim(),
      'companyType': 'Startup',
      'industryType': 'IT',
      'branchLocation': _branchCtrl.text.isNotEmpty ? _branchCtrl.text.trim() : 'HQ',
      'registrationNumber': _regCtrl.text.trim().toUpperCase(),
      'tanId': _tanCtrl.text.trim().toUpperCase(),
      'panId': _panCtrl.text.trim().toUpperCase(),
      'gstId': _gstCtrl.text.trim().toUpperCase(),
      'selectedPlanName': _selectedPlan,
      'durationMonths': _selectedDuration,
      'companySizeRange': '1-10',
    };

    final success = await auth.registerAdmin(data);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Company Admin Registered! Awaiting Superadmin activation.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Failed to register administrator.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Admin B2B Registration', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create Administrator Account',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Register your B2B corporate workspace tenant portal',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 28),

              // Section: Personal Details
              _buildSectionHeader('Personal Details'),
              _buildTextField(_nameCtrl, 'Full Name', Icons.person_outline_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 16),
              _buildTextField(_emailCtrl, 'Email Address', Icons.mail_outline_rounded, type: TextInputType.emailAddress, validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null),
              const SizedBox(height: 16),
              _buildTextField(
                _passCtrl, 
                'Password', 
                Icons.lock_outline_rounded, 
                obscure: _obscurePassword, 
                suffix: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: const Color(0xFF94A3B8)),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
                validator: (v) => v == null || v.length < 8 ? 'Password must be at least 8 characters' : null
              ),
              const SizedBox(height: 16),
              _buildTextField(_phoneCtrl, 'Contact Phone', Icons.phone_android_rounded, type: TextInputType.phone, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 28),

              // Section: Company Details
              _buildSectionHeader('Corporate Details'),
              _buildTextField(_companyCtrl, 'Company Name', Icons.business_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 16),
              _buildTextField(_branchCtrl, 'Branch Location (e.g. Headquarters)', Icons.location_on_outlined),
              const SizedBox(height: 28),

              // Section: Compliance & Tax Identifiers
              _buildSectionHeader('Corporate Tax Identifiers (Compliance)'),
              _buildTextField(_regCtrl, 'Corporate Registration Number', Icons.assignment_ind_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 16),
              _buildTextField(_panCtrl, 'Corporate PAN ID', Icons.credit_card_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 16),
              _buildTextField(_tanCtrl, 'Corporate TAN ID', Icons.account_balance_wallet_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 16),
              _buildTextField(_gstCtrl, 'Corporate GST ID', Icons.receipt_long_rounded, validator: (v) => v == null || v.isEmpty ? 'Required' : null),
              const SizedBox(height: 28),

              // Section: Subscription Plan
              _buildSectionHeader('Subscription Details'),
              _buildDropdown<String>('Select Subscription Plan', _selectedPlan, _plans, (val) {
                if (val != null) setState(() => _selectedPlan = val);
              }),
              const SizedBox(height: 16),
              _buildDropdown<int>('Duration (Months)', _selectedDuration, _durations, (val) {
                if (val != null) setState(() => _selectedDuration = val);
              }),
              const SizedBox(height: 36),

              // Submit Button
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: auth.isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: auth.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Register Corporate Workspace', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF2563EB), letterSpacing: 0.5),
        ),
        const Divider(color: Color(0xFFE2E8F0), height: 16, thickness: 1),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController ctrl, 
    String label, 
    IconData icon, {
      bool obscure = false, 
      Widget? suffix, 
      TextInputType type = TextInputType.text,
      String? Function(String?)? validator
    }
  ) {
    return TextFormField(
      controller: ctrl,
      obscureText: obscure,
      keyboardType: type,
      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF64748B)),
        prefixIcon: Icon(icon, color: const Color(0xFF94A3B8), size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      ),
      validator: validator,
    );
  }

  Widget _buildDropdown<T>(String label, T value, List<T> items, void Function(T?) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: value,
              dropdownColor: Colors.white,
              isExpanded: true,
              onChanged: onChanged,
              items: items.map<DropdownMenuItem<T>>((T item) {
                return DropdownMenuItem<T>(
                  value: item,
                  child: Text(item.toString()),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
}
