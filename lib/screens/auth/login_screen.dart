import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = 'Employee'; // Default role select options
  bool _obscurePassword = true;

  final List<String> _roles = ['Employee', 'HR', 'Admin'];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
      _selectedRole.toLowerCase(),
    );

    if (!mounted) return;

    if (success) {
      // Direct login without 2FA
      Navigator.pushReplacementNamed(context, '/home');
    } else if (auth.twoFactorRequired) {
      // Redirect to OTP verification screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const OtpScreen(),
        ),
      );
    } else if (auth.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage!),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFEFF6FF), // Blue 50
              Color(0xFFDBEAFE), // Blue 100
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Premium Logo Icon
                    const Icon(
                      Icons.blur_on_rounded,
                      size: 80,
                      color: Color(0xFF2563EB), // Blue 600
                    ),
                    const SizedBox(height: 16),
                    // Title
                    const Text(
                      'HRMS Workspace',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A), // Slate 900
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Access your employee self-service portal',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF475569), // Slate 600
                      ),
                    ),
                    const SizedBox(height: 40),
                    
                    // Card Box
                    Card(
                      elevation: 4,
                      color: Colors.white,
                      shadowColor: const Color(0x200F172A),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Email Field
                            TextFormField(
                              controller: _emailController,
                              style: const TextStyle(color: Color(0xFF0F172A)),
                              decoration: InputDecoration(
                                labelText: 'Email Address',
                                labelStyle: const TextStyle(color: Color(0xFF64748B)),
                                prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF64748B)),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter email';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            
                            // Password Field
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(color: Color(0xFF0F172A)),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                labelStyle: const TextStyle(color: Color(0xFF64748B)),
                                prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF64748B)),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    color: const Color(0xFF64748B),
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter password';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
 
                            // Role Selection Dropdown
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedRole,
                                  dropdownColor: Colors.white,
                                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16),
                                  icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF64748B)),
                                  isExpanded: true,
                                  onChanged: (String? newValue) {
                                    if (newValue != null) {
                                      setState(() {
                                        _selectedRole = newValue;
                                      });
                                    }
                                  },
                                  items: _roles.map<DropdownMenuItem<String>>((String value) {
                                    return DropdownMenuItem<String>(
                                      value: value,
                                      child: Text(value),
                                    );
                                  }).toList(),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
 
                            // Submit Button
                            ElevatedButton(
                              onPressed: auth.isLoading ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF43F5E), // Rose 500
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: auth.isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text(
                                      'Sign In',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    const Text(
                      'Testing Shortcuts',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildShortcutButton(
                          label: 'Admin',
                          email: 'admin@nexora.in',
                          password: 'Admin@123',
                          role: 'Admin',
                        ),
                        _buildShortcutButton(
                          label: 'HR',
                          email: 'hr@test.com',
                          password: 'password123',
                          role: 'HR',
                        ),
                        _buildShortcutButton(
                          label: 'Employee',
                          email: 'emp@test.com',
                          password: 'password123',
                          role: 'Employee',
                        ),
                        _buildShortcutButton(
                          label: 'SuperAdmin',
                          email: 'ceo@company.com',
                          password: 'supersecretpassword',
                          role: 'Admin',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildShortcutButton({
    required String label,
    required String email,
    required String password,
    required String role,
  }) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0),
        child: ElevatedButton(
          onPressed: () {
            setState(() {
              _emailController.text = email;
              _passwordController.text = password;
              _selectedRole = role;
            });
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFE2E8F0), // Slate 200
            foregroundColor: const Color(0xFF334155), // Slate 700
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
