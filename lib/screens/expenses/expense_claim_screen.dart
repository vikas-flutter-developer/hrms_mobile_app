import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/hr_provider.dart';

class ExpenseClaimScreen extends StatefulWidget {
  const ExpenseClaimScreen({super.key});

  @override
  State<ExpenseClaimScreen> createState() => _ExpenseClaimScreenState();
}

class _ExpenseClaimScreenState extends State<ExpenseClaimScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _selectedCategory = 'Travel';
  File? _receiptFile;

  final List<String> _categories = ['Travel', 'Food', 'Office Supplies', 'Others'];
  final _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchMyExpenses();
    });
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectReceiptSource() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: Color(0xFFF43F5E)),
                title: const Text('Take Photo', style: TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  _pickReceipt(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: Color(0xFF2563EB)),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  _pickReceipt(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickReceipt(ImageSource source) async {
    try {
      final XFile? image = await _pickReceiptFile(source);
      if (image != null) {
        setState(() {
          _receiptFile = File(image.path);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Image Source Error: $e')),
      );
    }
  }

  Future<XFile?> _pickReceiptFile(ImageSource source) async {
    return await _imagePicker.pickImage(
      source: source,
      imageQuality: 70, // Compress for network efficiency
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final hr = Provider.of<HrProvider>(context, listen: false);
    final success = await hr.submitExpense(
      _selectedCategory,
      double.parse(_amountCtrl.text),
      _descCtrl.text.trim(),
      _receiptFile,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense claim submitted!'), backgroundColor: Colors.green),
      );
      _amountCtrl.clear();
      _descCtrl.clear();
      setState(() {
        _receiptFile = null;
      });
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(hr.errorMessage ?? 'Failed to submit expense.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showClaimModal(BuildContext context) {
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
                      const Text(
                        'Submit Reimbursement Claim',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),

                      // Category Dropdown
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedCategory,
                            dropdownColor: Colors.white,
                            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16),
                            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF64748B)),
                            isExpanded: true,
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                setModalState(() {
                                  _selectedCategory = newValue;
                                });
                                setState(() {
                                  _selectedCategory = newValue;
                                });
                              }
                            },
                            items: _categories.map<DropdownMenuItem<String>>((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Amount
                      TextFormField(
                        controller: _amountCtrl,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Amount Spent (INR)',
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

                      // Description
                      TextFormField(
                        controller: _descCtrl,
                        maxLines: 2,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'Brief Description',
                          labelStyle: const TextStyle(color: Color(0xFF64748B)),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                          ),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Enter description' : null,
                      ),
                      const SizedBox(height: 16),

                      // Camera capture receipt widget
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                  await _selectReceiptSource();
                                  setModalState(() {});
                              },
                              icon: const Icon(Icons.camera_alt_rounded, color: Color(0xFFF43F5E)),
                              label: const Text('Capture Receipt', style: TextStyle(color: Color(0xFFF43F5E))),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFF43F5E)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          if (_receiptFile != null) ...[
                            const SizedBox(width: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                _receiptFile!,
                                width: 50,
                                height: 50,
                                fit: BoxFit.cover,
                              ),
                            )
                          ]
                        ],
                      ),
                      const SizedBox(height: 24),

                      ElevatedButton(
                        onPressed: _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF43F5E),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Submit Claim', style: TextStyle(fontWeight: FontWeight.bold)),
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

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Expense Claims', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.myExpenses.isEmpty
          ? const Center(
              child: Text(
                'No reimbursement claims filed.',
                style: TextStyle(color: Color(0xFF64748B)),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: hr.myExpenses.length,
              itemBuilder: (context, index) {
                final exp = hr.myExpenses[index];
                final status = exp['status'] ?? 'Pending';
                
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
                      child: const Icon(Icons.receipt_rounded, color: Color(0xFF2563EB)),
                    ),
                    title: Text(
                      '${exp['category']} Claim',
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          'Spent: ₹ ${exp['amount']}',
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          exp['description'] ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (exp['hasReceipt'] == true)
                          IconButton(
                            icon: const Icon(Icons.attachment_rounded, color: Color(0xFF2563EB)),
                            onPressed: () => _viewReceipt(context, exp['_id']),
                            tooltip: 'View Receipt',
                          ),
                        _buildStatusBadge(status),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showClaimModal(context),
        backgroundColor: const Color(0xFFF43F5E),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _viewReceipt(BuildContext context, String expenseId) {
    showDialog(
      context: context,
      builder: (context) {
        final hr = Provider.of<HrProvider>(context, listen: false);
        return AlertDialog(
          title: const Text('Receipt Preview', style: TextStyle(fontWeight: FontWeight.bold)),
          content: FutureBuilder<Uint8List?>(
            future: hr.fetchReceiptBytes(expenseId),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(
                  height: 150,
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError || snapshot.data == null) {
                return const SizedBox(
                  height: 100,
                  child: Center(child: Text('Failed to load receipt image.')),
                );
              }
              return Image.memory(snapshot.data!, fit: BoxFit.contain);
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            )
          ],
        );
      },
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
      default:
        color = Colors.blueGrey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
