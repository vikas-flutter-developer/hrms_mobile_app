import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/hr_provider.dart';
import '../../services/location_service.dart';
import 'regularize_screen.dart';

class ClockScreen extends StatefulWidget {
  const ClockScreen({super.key});

  @override
  State<ClockScreen> createState() => _ClockScreenState();
}

class _ClockScreenState extends State<ClockScreen> {
  final _locationService = LocationService();
  bool _isGettingLocation = false;
  String _currentCoordinates = '';
  bool _showCalendarView = false;
  String _selectedMethod = 'GPS'; // 'GPS', 'Biometric', 'QR Code'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchAttendanceStatus();
    });
  }

  int _getDaysInMonth(int year, int month) {
    return DateTime(year, month + 1, 0).day;
  }

  int _getFirstWeekdayOfMonth(int year, int month) {
    return DateTime(year, month, 1).weekday;
  }

  Map<String, dynamic>? _getLedgerEntryForDay(int day) {
    final hr = Provider.of<HrProvider>(context, listen: false);
    final now = DateTime.now();
    final monthStr = now.month.toString().padLeft(2, '0');
    final dayStr = day.toString().padLeft(2, '0');
    final targetDate = '${now.year}-$monthStr-$dayStr';
    
    for (final log in hr.monthlyLedger) {
      if (log['date'] == targetDate) {
        return log;
      }
    }
    return null;
  }

  Future<void> _handleClockToggle() async {
    final hr = Provider.of<HrProvider>(context, listen: false);

    if (_selectedMethod == 'GPS') {
      setState(() {
        _isGettingLocation = true;
      });

      try {
        final coordinates = await _locationService.getCurrentCoordinatesString();
        if (coordinates.isEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Failed to capture GPS coordinates. Please check location permissions.'),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
          return;
        }

        setState(() {
          _currentCoordinates = coordinates;
        });

        bool success;
        if (hr.isCheckedIn) {
          success = await hr.checkOut(coordinates, source: 'Mobile App');
        } else {
          success = await hr.checkIn(coordinates, source: 'Mobile App');
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(success ? 'GPS clock status updated successfully!' : 'Failed to update clock status.'),
              backgroundColor: success ? Colors.green : Colors.redAccent,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: $e'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      } finally {
        setState(() {
          _isGettingLocation = false;
        });
      }
    } else if (_selectedMethod == 'Biometric') {
      _showBiometricScannerSheet(hr);
    } else if (_selectedMethod == 'QR Code') {
      _showQRScannerSheet(hr);
    }
  }

  void _showBiometricScannerSheet(HrProvider hr) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isDismissible: false,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (dialogContext) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Biometric Verification',
                style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Keep fingerprint on scanner for authentication',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
              ),
              const SizedBox(height: 40),
              _SimulatedFingerprintScanner(
                onSuccess: () async {
                  Navigator.pop(dialogContext);
                  setState(() {
                    _isGettingLocation = true;
                  });
                  final coordinates = await _locationService.getCurrentCoordinatesString();
                  final coords = coordinates.isNotEmpty ? coordinates : '0.00,0.00';
                  final success = hr.isCheckedIn
                      ? await hr.checkOut(coords, source: 'Biometric Check-In')
                      : await hr.checkIn(coords, source: 'Biometric Check-In');

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(success ? 'Biometric Clock status updated!' : 'Failed biometric validation.'),
                        backgroundColor: success ? Colors.green : Colors.redAccent,
                      ),
                    );
                  }
                  setState(() {
                    _isGettingLocation = false;
                  });
                },
              ),
              const SizedBox(height: 40),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel Scan', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showQRScannerSheet(HrProvider hr) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isDismissible: false,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (dialogContext) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Company QR Scanner',
                style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Point device camera at the corporate display QR code',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
              ),
              const SizedBox(height: 32),
              _SimulatedQRScanner(
                onSuccess: () async {
                  Navigator.pop(dialogContext);
                  setState(() {
                    _isGettingLocation = true;
                  });
                  final coordinates = await _locationService.getCurrentCoordinatesString();
                  final coords = coordinates.isNotEmpty ? coordinates : '0.00,0.00';
                  final success = hr.isCheckedIn
                      ? await hr.checkOut(coords, source: 'QR Code Check-In')
                      : await hr.checkIn(coords, source: 'QR Code Check-In');

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(success ? 'QR Attendance registered!' : 'QR signature validation failed.'),
                        backgroundColor: success ? Colors.green : Colors.redAccent,
                      ),
                    );
                  }
                  setState(() {
                    _isGettingLocation = false;
                  });
                },
              ),
              const SizedBox(height: 32),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Close Scanner', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMethodTab(String method, IconData icon) {
    final isSelected = _selectedMethod == method;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedMethod = method;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? const [
                    BoxShadow(
                      color: Color(0x0F0F172A),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                method,
                style: TextStyle(
                  color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);

    // Get coordinates from today's logs if any
    String checkInCoords = '';
    String checkOutCoords = '';
    for (final log in hr.todaysLogs) {
      if (log['type'] == 'Check-In') {
        checkInCoords = log['coordinates'] ?? '';
      } else if (log['type'] == 'Check-Out') {
        checkOutCoords = log['coordinates'] ?? '';
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text('Shift Attendance', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: hr.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9), // Slate 100
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        _buildMethodTab('GPS', Icons.gps_fixed_rounded),
                        _buildMethodTab('Biometric', Icons.fingerprint_rounded),
                        _buildMethodTab('QR Code', Icons.qr_code_scanner_rounded),
                      ],
                    ),
                  ),
                  // Check-in Circle Trigger
                  Expanded(
                    flex: 4,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          GestureDetector(
                            onTap: _isGettingLocation ? null : _handleClockToggle,
                            child: Container(
                              width: 180,
                              height: 180,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: hr.isCheckedIn ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                boxShadow: [
                                  BoxShadow(
                                    color: (hr.isCheckedIn ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withOpacity(0.3),
                                    blurRadius: 20,
                                    spreadRadius: 5,
                                  )
                                ],
                              ),
                              child: Center(
                                child: _isGettingLocation
                                    ? const CircularProgressIndicator(color: Colors.white)
                                    : Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            hr.isCheckedIn ? Icons.exit_to_app_rounded : Icons.fingerprint_rounded,
                                            size: 50,
                                            color: Colors.white,
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            hr.isCheckedIn ? 'CLOCK OUT' : 'CLOCK IN',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: 1.1,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          if (checkInCoords.isNotEmpty || checkOutCoords.isNotEmpty || _currentCoordinates.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                children: [
                                  if (checkInCoords.isNotEmpty)
                                    Text(
                                      'Check-In GPS: $checkInCoords',
                                      style: const TextStyle(color: Color(0xFF475569), fontSize: 11, fontWeight: FontWeight.w500),
                                    ),
                                  if (checkOutCoords.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4.0),
                                      child: Text(
                                        'Check-Out GPS: $checkOutCoords',
                                        style: const TextStyle(color: Color(0xFF475569), fontSize: 11, fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                  if (checkInCoords.isEmpty && checkOutCoords.isEmpty && _currentCoordinates.isNotEmpty)
                                    Text(
                                      'Active GPS: $_currentCoordinates',
                                      style: const TextStyle(color: Color(0xFF475569), fontSize: 11, fontWeight: FontWeight.w500),
                                    ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
 
                  // Ledger / Attendance history header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Monthly History Log',
                          style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: Icon(
                                _showCalendarView ? Icons.list_alt_rounded : Icons.calendar_month_rounded,
                                color: const Color(0xFF2563EB),
                              ),
                              onPressed: () {
                                setState(() {
                                  _showCalendarView = !_showCalendarView;
                                });
                              },
                              tooltip: _showCalendarView ? 'Show List' : 'Show Calendar',
                            ),
                            TextButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const RegularizeScreen()),
                                );
                              },
                              icon: const Icon(Icons.edit_calendar_rounded, size: 16, color: Color(0xFF2563EB)),
                              label: const Text('Regularize', style: TextStyle(color: Color(0xFF2563EB))),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
 
                  Expanded(
                    flex: 5,
                    child: Card(
                      elevation: 2,
                      color: Colors.white,
                      shadowColor: const Color(0x100F172A),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: hr.monthlyLedger.isEmpty
                          ? const Center(
                              child: Text(
                                'No attendance records logged for this month.',
                                style: TextStyle(color: Color(0xFF64748B)),
                              ),
                            )
                          : _showCalendarView
                              ? SingleChildScrollView(
                                  padding: const EdgeInsets.all(16),
                                  child: _buildCalendarView(hr),
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.all(12),
                                  itemCount: hr.monthlyLedger.length,
                                  separatorBuilder: (context, index) => const Divider(color: Color(0xFFE2E8F0)),
                                  itemBuilder: (context, index) {
                                    final log = hr.monthlyLedger[index];
                                    final dateStr = log['date'] ?? '';
                                    final statusStr = log['status'] ?? 'Absent';
                                    final hours = log['hours'] ?? 0.0;
 
                                    return Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                dateStr,
                                                style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Hours: ${hours.toStringAsFixed(1)} hrs',
                                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                              ),
                                            ],
                                          ),
                                          _buildStatusBadge(statusStr),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildCalendarView(HrProvider hr) {
    final now = DateTime.now();
    final daysInMonth = _getDaysInMonth(now.year, now.month);
    final firstWeekday = _getFirstWeekdayOfMonth(now.year, now.month);
    final offset = firstWeekday % 7; 

    final weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: weekDays.map((day) => Expanded(
            child: Center(
              child: Text(
                day,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF64748B), fontSize: 13),
              ),
            ),
          )).toList(),
        ),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
          ),
          itemCount: daysInMonth + offset,
          itemBuilder: (context, index) {
            if (index < offset) {
              return const SizedBox.shrink();
            }
            final day = index - offset + 1;
            final entry = _getLedgerEntryForDay(day);
            final status = (entry != null ? entry['status'] : '') as String? ?? '';
            
            Color dayColor = Colors.white;
            Color textColor = const Color(0xFF0F172A);
            Color borderColor = const Color(0xFFE2E8F0);

            if (status.isNotEmpty) {
              switch (status.toLowerCase()) {
                case 'present':
                  dayColor = const Color(0xFFD1FAE5); 
                  textColor = const Color(0xFF065F46);
                  borderColor = const Color(0xFF10B981);
                  break;
                case 'late':
                  dayColor = const Color(0xFFFEF3C7); 
                  textColor = const Color(0xFF92400E);
                  borderColor = const Color(0xFFF59E0B);
                  break;
                case 'early leave':
                case 'early exit':
                  dayColor = const Color(0xFFFFE4E6); 
                  textColor = const Color(0xFF9F1239);
                  borderColor = const Color(0xFFF43F5E);
                  break;
                case 'half-day':
                  dayColor = const Color(0xFFFFEDD5); 
                  textColor = const Color(0xFF9A3412);
                  borderColor = const Color(0xFFF97316);
                  break;
                case 'absent':
                  dayColor = const Color(0xFFFEE2E2); 
                  textColor = const Color(0xFF991B1B);
                  borderColor = const Color(0xFFEF4444);
                  break;
                case 'leave':
                  dayColor = const Color(0xFFF3E8FF); 
                  textColor = const Color(0xFF6B21A8);
                  borderColor = const Color(0xFFA855F7);
                  break;
                default:
                  dayColor = const Color(0xFFF1F5F9);
                  textColor = const Color(0xFF475569);
                  borderColor = const Color(0xFFCBD5E1);
              }
            }

            return Container(
              decoration: BoxDecoration(
                color: dayColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Center(
                child: Text(
                  '$day',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'present':
        color = const Color(0xFF10B981);
        break;
      case 'late':
        color = Colors.amber[700]!;
        break;
      case 'half-day':
        color = Colors.orange;
        break;
      case 'absent':
        color = const Color(0xFFEF4444);
        break;
      case 'leave':
        color = Colors.purple;
        break;
      case 'early leave':
      case 'early exit':
        color = const Color(0xFFF43F5E);
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
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _SimulatedFingerprintScanner extends StatefulWidget {
  final VoidCallback onSuccess;
  const _SimulatedFingerprintScanner({required this.onSuccess});

  @override
  State<_SimulatedFingerprintScanner> createState() => _SimulatedFingerprintScannerState();
}

class _SimulatedFingerprintScannerState extends State<_SimulatedFingerprintScanner> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    
    _controller.forward().then((_) {
      if (mounted) {
        setState(() {
          _isSuccess = true;
        });
        Future.delayed(const Duration(milliseconds: 600), widget.onSuccess);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final scale = 1.0 + (_controller.value * 0.15);
        return Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _isSuccess ? Colors.green.withOpacity(0.1) : const Color(0xFF2563EB).withOpacity(0.1),
            border: Border.all(
              color: _isSuccess ? Colors.green : const Color(0xFF2563EB),
              width: 3,
            ),
          ),
          child: Transform.scale(
            scale: _isSuccess ? 1.0 : scale,
            child: Icon(
              _isSuccess ? Icons.check_circle_rounded : Icons.fingerprint_rounded,
              size: 54,
              color: _isSuccess ? Colors.green : const Color(0xFF2563EB),
            ),
          ),
        );
      },
    );
  }
}

class _SimulatedQRScanner extends StatefulWidget {
  final VoidCallback onSuccess;
  const _SimulatedQRScanner({required this.onSuccess});

  @override
  State<_SimulatedQRScanner> createState() => _SimulatedQRScannerState();
}

class _SimulatedQRScannerState extends State<_SimulatedQRScanner> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    // Simulate successful scan after 2.5 seconds
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (mounted) {
        widget.onSuccess();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF64748B), width: 2),
      ),
      child: Stack(
        children: [
          // Reticle Targeting Corners
          Positioned(
            top: 16,
            left: 16,
            child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFF2563EB), width: 4), left: BorderSide(color: Color(0xFF2563EB), width: 4)))),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFF2563EB), width: 4), right: BorderSide(color: Color(0xFF2563EB), width: 4)))),
          ),
          Positioned(
            bottom: 16,
            left: 16,
            child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF2563EB), width: 4), left: BorderSide(color: Color(0xFF2563EB), width: 4)))),
          ),
          Positioned(
            bottom: 16,
            right: 16,
            child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF2563EB), width: 4), right: BorderSide(color: Color(0xFF2563EB), width: 4)))),
          ),
          
          // Simulated Scanning Laser Line
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final topOffset = 20.0 + (_controller.value * 160.0);
              return Positioned(
                top: topOffset,
                left: 20,
                right: 20,
                child: Container(
                  height: 3,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFFEF4444),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const Center(
            child: Icon(Icons.qr_code_2_rounded, size: 80, color: Colors.black26),
          ),
        ],
      ),
    );
  }
}
