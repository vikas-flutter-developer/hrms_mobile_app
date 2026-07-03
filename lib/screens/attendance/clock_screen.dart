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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HrProvider>(context, listen: false).fetchAttendanceStatus();
    });
  }

  Future<void> _handleClockToggle() async {
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

      final hr = Provider.of<HrProvider>(context, listen: false);
      bool success;
      if (hr.isCheckedIn) {
        success = await hr.checkOut(coordinates);
      } else {
        success = await hr.checkIn(coordinates);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Clock status updated successfully!' : 'Failed to update clock status.'),
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
  }

  @override
  Widget build(BuildContext context) {
    final hr = Provider.of<HrProvider>(context);

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
                  // Check-in Circle Trigger
                  Expanded(
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
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          if (_currentCoordinates.isNotEmpty) ...[
                            Text(
                              'Captured coordinates: $_currentCoordinates',
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
 
                  // Ledger / Attendance history
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Monthly History Log',
                          style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
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
                  ),
 
                  Expanded(
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

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'present':
        color = const Color(0xFF10B981);
        break;
      case 'late':
        color = Colors.amber;
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
