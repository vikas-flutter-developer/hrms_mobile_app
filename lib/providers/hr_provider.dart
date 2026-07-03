import 'dart:io';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/leave.dart';
import '../models/payroll.dart';
import '../models/asset.dart';
import '../models/helpdesk.dart';
import '../models/app_user.dart';

class HrProvider with ChangeNotifier {
  final _api = ApiService();
  bool _isLoading = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // --- Attendance State ---
  bool _isCheckedIn = false;
  List<Map<String, dynamic>> _todaysLogs = [];
  List<Map<String, dynamic>> _monthlyLedger = [];
  List<Holiday> _holidays = [];
  
  bool get isCheckedIn => _isCheckedIn;
  List<Map<String, dynamic>> get todaysLogs => _todaysLogs;
  List<Map<String, dynamic>> get monthlyLedger => _monthlyLedger;
  List<Holiday> get holidays => _holidays;

  // --- Leaves State ---
  LeaveBalances? _leaveBalances;
  List<LeaveRequest> _myLeaveRequests = [];
  List<LeaveRequest> _staffLeaveRequests = [];
  
  LeaveBalances? get leaveBalances => _leaveBalances;
  List<LeaveRequest> get myLeaveRequests => _myLeaveRequests;
  List<LeaveRequest> get staffLeaveRequests => _staffLeaveRequests;

  // --- Payroll & Loans State ---
  List<Payslip> _myPayslips = [];
  List<Payslip> _staffPayslips = [];
  List<LoanRequest> _myLoans = [];
  
  List<Payslip> get myPayslips => _myPayslips;
  List<Payslip> get staffPayslips => _staffPayslips;
  List<LoanRequest> get myLoans => _myLoans;

  // --- Expenses State ---
  List<Map<String, dynamic>> _myExpenses = [];
  List<Map<String, dynamic>> get myExpenses => _myExpenses;

  // --- Assets State ---
  List<Asset> _myAssets = [];
  List<AssetRequestModel> _myAssetRequests = [];
  
  List<Asset> get myAssets => _myAssets;
  List<AssetRequestModel> get myAssetRequests => _myAssetRequests;

  // --- Helpdesk State ---
  List<HelpdeskTicket> _myTickets = [];
  List<HelpdeskTicket> get myTickets => _myTickets;

  // --- Directory / Team State ---
  List<AppUser> _myTeam = [];
  List<AppUser> get myTeam => _myTeam;

  // --- Notifications State ---
  List<Map<String, dynamic>> _notifications = [];
  List<Map<String, dynamic>> get notifications => _notifications;

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void _setError(String? message) {
    _errorMessage = message;
    notifyListeners();
  }

  // ==========================================
  // 📅 ATTENDANCE ACTIONS
  // ==========================================

  Future<void> fetchAttendanceStatus() async {
    _setLoading(true);
    _setError(null);
    try {
      final response = await _api.get('/attendance/status');
      if (response.statusCode == 200) {
        final data = response.data;
        _isCheckedIn = data['isCheckedIn'] ?? false;
        _todaysLogs = List<Map<String, dynamic>>.from(data['todaysLogs'] ?? []);
        _monthlyLedger = List<Map<String, dynamic>>.from(data['monthlyLedger'] ?? []);
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> checkIn(String coordinates) async {
    _setError(null);
    try {
      final response = await _api.post('/attendance/mobile-check-in', data: {
        'locationCoordinates': coordinates,
        'deviceKey': 'mobile_hrms_app_secured_key',
      });
      if (response.statusCode == 200) {
        await fetchAttendanceStatus();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> checkOut(String coordinates) async {
    _setError(null);
    try {
      final response = await _api.post('/attendance/mobile-check-in', data: {
        'locationCoordinates': coordinates,
        'deviceKey': 'mobile_hrms_app_secured_key',
      });
      if (response.statusCode == 200) {
        await fetchAttendanceStatus();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchHolidays() async {
    try {
      final response = await _api.get('/attendance/holidays');
      if (response.statusCode == 200) {
        _holidays = (response.data as List).map((x) => Holiday.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Error holidays: $e');
    }
  }

  Future<bool> addHoliday(String name, String date, String type, String description) async {
    try {
      _isLoading = true;
      notifyListeners();
      final response = await _api.post('/attendance/holidays', data: {
        'name': name,
        'date': date,
        'type': type,
        'description': description,
      });
      _isLoading = false;
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchHolidays();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> updateHoliday(String id, String name, String date, String type, String description) async {
    try {
      _isLoading = true;
      notifyListeners();
      final response = await _api.patch('/attendance/holidays/$id', data: {
        'name': name,
        'date': date,
        'type': type,
        'description': description,
      });
      _isLoading = false;
      if (response.statusCode == 200) {
        await fetchHolidays();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteHoliday(String id) async {
    try {
      _isLoading = true;
      notifyListeners();
      final response = await _api.delete('/attendance/holidays/$id');
      _isLoading = false;
      if (response.statusCode == 200) {
        await fetchHolidays();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> submitRegularization(String date, String requestedStatus, String reason) async {
    try {
      final response = await _api.post('/attendance/regularization', data: {
        'date': date,
        'requestedStatus': requestedStatus,
        'reason': reason,
      });
      return response.statusCode == 201;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 🏖️ LEAVE PORTAL ACTIONS
  // ==========================================

  Future<void> fetchLeaveRequests() async {
    _setLoading(true);
    try {
      final response = await _api.get('/leaves/my-requests');
      if (response.statusCode == 200) {
        final data = response.data;
        _leaveBalances = LeaveBalances.fromJson(data['balances'] ?? {});
        _myLeaveRequests = (data['history'] as List).map((x) => LeaveRequest.fromJson(x)).toList();
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> applyLeave(String type, String startDate, String endDate, int days, String reason) async {
    try {
      final response = await _api.post('/leaves/apply', data: {
        'type': type,
        'startDate': startDate,
        'endDate': endDate,
        'days': days,
        'reason': reason,
      });
      if (response.statusCode == 201) {
        await fetchLeaveRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchStaffLeaveRequests() async {
    _setLoading(true);
    try {
      final response = await _api.get('/leaves/all');
      if (response.statusCode == 200) {
        if (response.data is List) {
          _staffLeaveRequests = (response.data as List).map((x) => LeaveRequest.fromJson(x)).toList();
        } else if (response.data is Map && response.data['data'] != null) {
          _staffLeaveRequests = (response.data['data'] as List).map((x) => LeaveRequest.fromJson(x)).toList();
        }
        notifyListeners();
      }
    } catch (e) {
      print('Fetch staff leaves error: $e');
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resolveStaffLeaveRequest(String id, String action) async {
    try {
      _setLoading(true);
      final response = await _api.patch('/leaves/$id/action', data: {
        'status': action, // 'Approved' or 'Rejected'
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchStaffLeaveRequests();
        await fetchLeaveRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> editLeaveRequest(String id, String type, String startDate, String endDate, int days, String reason) async {
    try {
      _setLoading(true);
      final response = await _api.put('/leaves/$id', data: {
        'type': type,
        'startDate': startDate,
        'endDate': endDate,
        'days': days,
        'reason': reason,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchStaffLeaveRequests();
        await fetchLeaveRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteLeaveRequest(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/leaves/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchStaffLeaveRequests();
        await fetchLeaveRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 💰 PAYROLL & LOANS
  // ==========================================

  Future<void> fetchMyPayslips() async {
    try {
      final response = await _api.get('/payroll/my-payslips');
      if (response.statusCode == 200) {
        _myPayslips = (response.data as List).map((x) => Payslip.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Payslips error: $e');
    }
  }

  Future<void> fetchStaffPayslips() async {
    try {
      _setLoading(true);
      final response = await _api.get('/payroll');
      _setLoading(false);
      if (response.statusCode == 200) {
        _staffPayslips = (response.data as List).map((x) => Payslip.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      _setLoading(false);
      print('Staff payslips error: $e');
    }
  }

  Future<bool> runMonthlyPayroll(String month) async {
    try {
      _setLoading(true);
      final response = await _api.post('/payroll/run-payroll', data: {'month': month});
      _setLoading(false);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchStaffPayslips();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> createManualPayslip({
    required String employeeId,
    required String month,
    required double basicPay,
    required double hra,
    required double specialAllowance,
    required double bonus,
    required double pfDeduction,
    required double tds,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/payroll/create-manual', data: {
        'employeeId': employeeId,
        'month': month,
        'basicPay': basicPay,
        'hra': hra,
        'specialAllowance': specialAllowance,
        'bonus': bonus,
        'pfDeduction': pfDeduction,
        'tds': tds,
        'status': 'Paid',
      });
      _setLoading(false);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchStaffPayslips();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchMyLoans() async {
    try {
      // In payroll.js, GET /loans gets all loans for administrators,
      // but for standard employees it is filtered or can be requested.
      final response = await _api.get('/payroll/loans');
      if (response.statusCode == 200) {
        _myLoans = (response.data as List).map((x) => LoanRequest.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Loans error: $e');
    }
  }

  Future<bool> applyLoan(double amount, String reason, double emiAmount) async {
    try {
      final response = await _api.post('/payroll/loans', data: {
        'amount': amount,
        'reason': reason,
        'emiAmount': emiAmount,
      });
      if (response.statusCode == 201) {
        await fetchMyLoans();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 💸 EXPENSE CLAIMS
  // ==========================================

  Future<void> fetchMyExpenses() async {
    try {
      final response = await _api.get('/expenses', queryParameters: {'mine': 'true'});
      if (response.statusCode == 200) {
        _myExpenses = List<Map<String, dynamic>>.from(response.data);
        notifyListeners();
      }
    } catch (e) {
      print('Expenses error: $e');
    }
  }

  Future<bool> submitExpense(String category, double amount, String description, File? receiptFile) async {
    try {
      final Map<String, File> filesMap = {};
      if (receiptFile != null) {
        filesMap['receipt'] = receiptFile;
      }

      final response = await _api.uploadFiles(
        '/expenses',
        filesMap,
        data: {
          'category': category,
          'amount': amount.toString(),
          'description': description,
          'dateIncurred': DateTime.now().toIso8601String().split('T')[0],
          'status': 'Pending',
        },
      );
      if (response.statusCode == 201) {
        await fetchMyExpenses();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 💻 ASSETS & DAMAGED CONTROLS
  // ==========================================

  Future<void> fetchMyAssets() async {
    try {
      final response = await _api.get('/assets', queryParameters: {'assignedToMe': 'true'});
      if (response.statusCode == 200) {
        _myAssets = (response.data as List).map((x) => Asset.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Assets error: $e');
    }
  }

  Future<void> fetchMyAssetRequests() async {
    try {
      final response = await _api.get('/assets/my-requests');
      if (response.statusCode == 200) {
        _myAssetRequests = (response.data as List).map((x) => AssetRequestModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Asset requests error: $e');
    }
  }

  Future<bool> submitAssetRequest(String assetType, String reason, String urgency) async {
    try {
      final response = await _api.post('/assets/request', data: {
        'assetType': assetType,
        'reason': reason,
        'urgency': urgency,
      });
      if (response.statusCode == 201) {
        await fetchMyAssetRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> reportAssetDamage(String assetId, String description) async {
    try {
      final response = await _api.post('/assets/$assetId/report-damage', data: {
        'description': description,
      });
      return response.statusCode == 201;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 🛠️ HELPDESK TICKETS
  // ==========================================

  Future<void> fetchMyTickets() async {
    try {
      // In helpdesk routes, GET / finds all company tickets, but filtering can be checked
      final response = await _api.get('/helpdesk');
      if (response.statusCode == 200) {
        _myTickets = (response.data as List).map((x) => HelpdeskTicket.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Tickets error: $e');
    }
  }

  Future<bool> submitTicket(String title, String description, String category, String priority) async {
    try {
      final response = await _api.post('/helpdesk', data: {
        'title': title,
        'description': description,
        'category': category,
        'priority': priority,
      });
      if (response.statusCode == 201) {
        await fetchMyTickets();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 👥 TEAM MEMBERS DIRECTORY
  // ==========================================

  Future<void> fetchMyTeam() async {
    try {
      final response = await _api.get('/employees');
      if (response.statusCode == 200) {
        _myTeam = (response.data as List).map((x) => AppUser.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Team error: $e');
    }
  }

  Future<bool> createEmployee({
    required String name,
    required String email,
    required String phone,
    required String department,
    required String positionLevel,
    required double baseSalary,
    required String password,
    String? panNumber,
    String? documentsLink,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/employees/create-employee', data: {
        'name': name,
        'email': email,
        'phone': phone,
        'department': department,
        'positionLevel': positionLevel,
        'role': 'employee',
        'baseSalary': baseSalary,
        'salary': baseSalary,
        'password': password,
        'panNumber': panNumber,
        'documentsLink': documentsLink,
        'joinDate': DateTime.now().toIso8601String().split('T')[0],
      });
      _setLoading(false);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchMyTeam();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 🔔 NOTIFICATIONS FEED
  // ==========================================

  Future<void> fetchNotifications() async {
    try {
      final response = await _api.get('/user/notifications');
      if (response.statusCode == 200) {
        _notifications = List<Map<String, dynamic>>.from(response.data);
        notifyListeners();
      }
    } catch (e) {
      print('Notifications error: $e');
    }
  }

  Future<void> markNotificationRead(String id) async {
    try {
      final response = await _api.put('/user/notifications/$id/read');
      if (response.statusCode == 200) {
        await fetchNotifications();
      }
    } catch (e) {
      print('Mark notification read error: $e');
    }
  }
}
