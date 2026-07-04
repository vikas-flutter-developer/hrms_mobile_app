import 'dart:io';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/leave.dart';
import '../models/payroll.dart';
import '../models/asset.dart';
import '../models/helpdesk.dart';
import '../models/app_user.dart';
import '../models/announcement.dart';
import '../models/project.dart';
import '../models/event_model.dart';
import '../models/performance_review.dart';

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
  List<AssetDamageModel> _assetDamages = [];
  
  List<Asset> get myAssets => _myAssets;
  List<AssetRequestModel> get myAssetRequests => _myAssetRequests;
  List<AssetDamageModel> get assetDamages => _assetDamages;

  // --- Helpdesk State ---
  List<HelpdeskTicket> _myTickets = [];
  List<HelpdeskTicket> get myTickets => _myTickets;

  // --- Directory / Team State ---
  List<AppUser> _myTeam = [];
  List<AppUser> get myTeam => _myTeam;

  // --- Notifications State ---
  List<Map<String, dynamic>> _notifications = [];
  List<Map<String, dynamic>> get notifications => _notifications;

  // --- Live Chat State ---
  List<Map<String, dynamic>> _chatMessages = [];
  List<Map<String, dynamic>> get chatMessages => _chatMessages;

  // --- Extended Modules State ---
  List<AnnouncementModel> _announcements = [];
  List<ProjectModel> _projects = [];
  List<TaskModel> _projectTasks = [];
  List<CompanyEventModel> _events = [];
  Map<String, dynamic> _reportOverview = {};
  List<dynamic> _recruitmentCandidates = [];
  List<PerformanceReviewModel> _performanceReviews = [];
  List<dynamic> _trainingPrograms = [];
  List<dynamic> _trainingAssignments = [];

  List<AnnouncementModel> get announcements => _announcements;
  List<ProjectModel> get projects => _projects;
  List<TaskModel> get projectTasks => _projectTasks;
  List<CompanyEventModel> get events => _events;
  Map<String, dynamic> get reportOverview => _reportOverview;
  List<dynamic> get recruitmentCandidates => _recruitmentCandidates;
  List<PerformanceReviewModel> get performanceReviews => _performanceReviews;
  List<dynamic> get trainingPrograms => _trainingPrograms;
  List<dynamic> get trainingAssignments => _trainingAssignments;

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
      final response = await _api.get('/payroll/loans');
      if (response.statusCode == 200) {
        _myLoans = (response.data as List).map((x) => LoanRequest.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Loans error: $e');
    }
  }

  Future<bool> applyLoan(double amount, String reason, double emiAmount, {String? employeeId}) async {
    try {
      final Map<String, dynamic> data = {
        'amount': amount,
        'reason': reason,
        'emiAmount': emiAmount,
      };
      if (employeeId != null && employeeId.isNotEmpty) {
        data['employeeId'] = employeeId;
      }
      final response = await _api.post('/payroll/loans', data: data);
      if (response.statusCode == 201 || response.statusCode == 200) {
        await fetchMyLoans();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> resolveLoanStatus(String loanId, String status) async {
    try {
      _setLoading(true);
      final response = await _api.patch('/payroll/loans/$loanId', data: {'status': status});
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchMyLoans();
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

  Future<bool> resolveAssetRequestStatus(String requestId, String status, {String? adminNotes}) async {
    try {
      _setLoading(true);
      final response = await _api.put('/assets/requests/$requestId/status', data: {
        'status': status, // 'Approved' or 'Rejected'
        'adminNotes': adminNotes ?? 'Actioned by Admin',
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchMyAssetRequests();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> createCompanyAsset({
    required String name,
    required String category,
    required String serialNumber,
    required String condition,
    required double purchaseValue,
    String? empName,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/assets', data: {
        'name': name,
        'category': category,
        'serialNumber': serialNumber,
        'condition': condition,
        'status': 'Assigned',
        'purchaseValue': purchaseValue,
        if (empName != null && empName.isNotEmpty) 'empName': empName,
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchMyAssets();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchAssetDamages() async {
    try {
      final response = await _api.get('/assets/damages');
      if (response.statusCode == 200) {
        _assetDamages = (response.data as List).map((x) => AssetDamageModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Asset damages error: $e');
    }
  }

  Future<bool> resolveAssetDamage({
    required String damageId,
    required double repairCost,
    required String paymentMode,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/assets/damages/$damageId/status', data: {
        'repairCost': repairCost,
        'paymentMode': paymentMode,
        'status': status,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchAssetDamages();
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
  // 🛠️ HELPDESK TICKETS
  // ==========================================

  Future<void> fetchMyTickets() async {
    try {
      final response = await _api.get('/helpdesk/tickets');
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
      final response = await _api.post('/helpdesk/tickets', data: {
        'subject': title,
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

  Future<bool> updateTicketStatus({
    required String ticketId,
    required String status,
    String? resolutionNotes,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.patch('/helpdesk/tickets/$ticketId', data: {
        'status': status,
        if (resolutionNotes != null && resolutionNotes.isNotEmpty) 'resolutionNotes': resolutionNotes,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchMyTickets();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchGlobalMessages() async {
    try {
      final response = await _api.get('/messages/global');
      if (response.statusCode == 200) {
        _chatMessages = List<Map<String, dynamic>>.from(response.data);
        notifyListeners();
      }
    } catch (e) {
      print('Fetch chat messages error: $e');
    }
  }

  Future<bool> sendGlobalMessage(String content) async {
    try {
      final response = await _api.post('/messages/global', data: {'content': content});
      if (response.statusCode == 201) {
        await fetchGlobalMessages();
        return true;
      }
      return false;
    } catch (e) {
      print('Send chat message error: $e');
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

  // ==========================================
  // 📢 ANNOUNCEMENTS & NOTICE BOARD
  // ==========================================
  Future<void> fetchAnnouncements() async {
    try {
      final response = await _api.get('/announcements');
      if (response.statusCode == 200) {
        _announcements = (response.data as List).map((x) => AnnouncementModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Announcements error: $e');
    }
  }

  Future<bool> createAnnouncement(String title, String message, String audience, {int? visibleForHours}) async {
    try {
      _setLoading(true);
      final data = {
        'title': title,
        'message': message,
        'targetAudience': audience,
      };
      if (visibleForHours != null) {
        data['visibleForHours'] = visibleForHours.toString();
      }
      final response = await _api.post('/announcements', data: data);
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchAnnouncements();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> updateAnnouncement({
    required String id,
    required String title,
    required String message,
    required String audience,
    int? visibleForHours,
  }) async {
    try {
      _setLoading(true);
      final data = {
        'title': title,
        'message': message,
        'targetAudience': audience,
      };
      if (visibleForHours != null) {
        data['visibleForHours'] = visibleForHours.toString();
      } else {
        data['visibleForHours'] = 'null';
      }
      final response = await _api.put('/announcements/$id', data: data);
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchAnnouncements();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteAnnouncement(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/announcements/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchAnnouncements();
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
  // 📋 PROJECTS & TASK KANBAN
  // ==========================================
  Future<void> fetchProjects() async {
    try {
      final response = await _api.get('/projects');
      if (response.statusCode == 200) {
        _projects = (response.data as List).map((x) => ProjectModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Projects error: $e');
    }
  }

  Future<bool> createProject({
    required String name,
    required String description,
    required String department,
    required String startDate,
    required String endDate,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/projects', data: {
        'name': name,
        'description': description,
        'department': department,
        'startDate': startDate,
        'endDate': endDate,
        'status': 'In Progress',
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchProjects();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> updateProject({
    required String id,
    required String name,
    required String description,
    required String department,
    required String startDate,
    required String endDate,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/projects/$id', data: {
        'title': name,
        'description': description,
        'department': department,
        'startDate': startDate,
        'deadline': endDate,
        'status': status,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchProjects();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteProject(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/projects/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchProjects();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchMyTasks() async {
    try {
      final response = await _api.get('/tasks/my-tasks');
      if (response.statusCode == 200) {
        _projectTasks = (response.data as List).map((x) => TaskModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Tasks error: $e');
    }
  }

  Future<bool> updateTaskStatus(String taskId, String status) async {
    try {
      final response = await _api.patch('/tasks/$taskId/status', data: {'status': status});
      if (response.statusCode == 200) {
        await fetchMyTasks();
        return true;
      }
      return false;
    } catch (e) {
      print('Task status update error: $e');
      return false;
    }
  }

  Future<bool> createTask({
    required String projectId,
    required String title,
    required String description,
    required String assignedToId,
    required String priority,
    required String deadline,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/tasks', data: {
        'project': projectId,
        'title': title,
        'description': description,
        'assignedTo': assignedToId,
        'priority': priority,
        'deadline': deadline,
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchMyTasks();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> updateTask({
    required String id,
    required String projectId,
    required String title,
    required String description,
    required String assignedToId,
    required String priority,
    required String deadline,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/tasks/$id', data: {
        'project': projectId,
        'title': title,
        'description': description,
        'assignedTo': assignedToId,
        'priority': priority,
        'deadline': deadline,
        'status': status,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchMyTasks();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteTask(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/tasks/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchMyTasks();
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
  // 🎂 COMPANY EVENTS & CELEBRATIONS
  // ==========================================
  Future<void> fetchEvents() async {
    try {
      final response = await _api.get('/events');
      if (response.statusCode == 200) {
        _events = (response.data as List).map((x) => CompanyEventModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Events error: $e');
    }
  }

  Future<bool> createEvent({
    required String title,
    required String description,
    required String date,
    required String location,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/events', data: {
        'title': title,
        'description': description,
        'date': date,
        'location': location,
        'status': 'Upcoming',
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchEvents();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> updateEvent({
    required String id,
    required String title,
    required String description,
    required String date,
    required String location,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/events/$id', data: {
        'title': title,
        'description': description,
        'date': date,
        'location': location,
        'status': status,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchEvents();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      _setError(e.toString());
      return false;
    }
  }

  Future<bool> deleteEvent(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/events/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchEvents();
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
  // 📊 REPORTS & ANALYTICS OVERVIEW
  // ==========================================
  Future<void> fetchReportOverview() async {
    try {
      _setLoading(true);
      final responses = await Future.wait([
        _api.get('/reports/dashboard-overview'),
        _api.get('/reports/dashboard-stats'),
        _api.get('/reports/headcount-by-department'),
      ]);

      final Map<String, dynamic> mergedReport = {};
      
      if (responses[0].statusCode == 200 && responses[0].data != null) {
        mergedReport.addAll(Map<String, dynamic>.from(responses[0].data));
      }
      if (responses[1].statusCode == 200 && responses[1].data != null) {
        mergedReport['stats'] = Map<String, dynamic>.from(responses[1].data);
      }
      if (responses[2].statusCode == 200 && responses[2].data != null) {
        mergedReport['headcountByDept'] = List<dynamic>.from(responses[2].data);
      }
      
      _reportOverview = mergedReport;
      _setLoading(false);
      notifyListeners();
    } catch (e) {
      _setLoading(false);
      print('Report overview error: $e');
    }
  }

  Future<void> fetchRecruitmentCandidates() async {
    try {
      final response = await _api.get('/reports/recruitment');
      if (response.statusCode == 200) {
        _recruitmentCandidates = List<dynamic>.from(response.data['candidates'] ?? []);
        notifyListeners();
      }
    } catch (e) {
      print('Recruitment fetch error: $e');
    }
  }

  Future<void> fetchPerformanceReviews() async {
    try {
      _setLoading(true);
      final response = await _api.get('/performance/reviews');
      _setLoading(false);
      if (response.statusCode == 200) {
        _performanceReviews = (response.data as List).map((x) => PerformanceReviewModel.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      _setLoading(false);
      print('Performance reviews fetch error: $e');
    }
  }

  Future<bool> createPerformanceReview({
    required String employeeId,
    required String cycleId,
    required double rating,
    required String overallComments,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/performance/reviews', data: {
        'employee': employeeId,
        'cycle': cycleId,
        'rating': rating.toInt(),
        'status': status,
        'overallComments': overallComments,
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchPerformanceReviews();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Create performance review error: $e');
      return false;
    }
  }

  Future<bool> updatePerformanceReview({
    required String id,
    required double rating,
    required String overallComments,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/performance/reviews/$id', data: {
        'rating': rating.toInt(),
        'status': status,
        'overallComments': overallComments,
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchPerformanceReviews();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Update performance review error: $e');
      return false;
    }
  }

  Future<bool> deletePerformanceReview(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/performance/reviews/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchPerformanceReviews();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Delete performance review error: $e');
      return false;
    }
  }

  Future<void> fetchTrainingPrograms() async {
    try {
      final response = await _api.get('/training/programs');
      if (response.statusCode == 200) {
        _trainingPrograms = List<dynamic>.from(response.data ?? []);
        notifyListeners();
      }
    } catch (e) {
      print('Fetch training programs error: $e');
    }
  }

  Future<void> fetchTrainingAssignments() async {
    try {
      final response = await _api.get('/training/assignments');
      if (response.statusCode == 200) {
        _trainingAssignments = List<dynamic>.from(response.data ?? []);
        notifyListeners();
      }
    } catch (e) {
      print('Fetch training assignments error: $e');
    }
  }

  Future<bool> createTrainingProgram({
    required String title,
    required String description,
    required String category,
    required String mode,
    required String trainer,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/training/programs', data: {
        'title': title,
        'description': description,
        'category': category,
        'mode': mode,
        'trainer': trainer,
        'startDate': DateTime.now().toIso8601String(),
        'endDate': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
        'status': 'Ongoing'
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchTrainingPrograms();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Create training program error: $e');
      return false;
    }
  }

  Future<bool> assignEmployeeToTraining({
    required String employeeId,
    required String programId,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/training/assignments', data: {
        'employee': employeeId,
        'trainingProgram': programId,
        'status': 'In Progress'
      });
      _setLoading(false);
      if (response.statusCode == 201) {
        await fetchTrainingAssignments();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Assign employee to training error: $e');
      return false;
    }
  }

  Future<bool> deleteTrainingAssignment(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/training/assignments/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchTrainingAssignments();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Delete training assignment error: $e');
      return false;
    }
  }

  Future<bool> updateTrainingProgram({
    required String id,
    required String title,
    required String description,
    required String category,
    required String mode,
    required String trainer,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/training/programs/$id', data: {
        'title': title,
        'description': description,
        'category': category,
        'mode': mode,
        'trainer': trainer,
        'status': status
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchTrainingPrograms();
        await fetchTrainingAssignments(); // refresh assignments as they embed program data
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Update training program error: $e');
      return false;
    }
  }

  Future<bool> updateTrainingAssignmentStatus({
    required String id,
    required String status,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.put('/training/assignments/$id', data: {
        'status': status
      });
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchTrainingAssignments();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Update training assignment status error: $e');
      return false;
    }
  }

  Future<bool> deleteTrainingProgram(String id) async {
    try {
      _setLoading(true);
      final response = await _api.delete('/training/programs/$id');
      _setLoading(false);
      if (response.statusCode == 200) {
        await fetchTrainingPrograms();
        await fetchTrainingAssignments();
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Delete training program error: $e');
      return false;
    }
  }

  Future<bool> issueCertificate({
    required String programId,
    required String employeeId,
  }) async {
    try {
      _setLoading(true);
      final response = await _api.post('/training/$programId/certificate/$employeeId');
      _setLoading(false);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return true;
      }
      return false;
    } catch (e) {
      _setLoading(false);
      print('Issue certificate error: $e');
      return false;
    }
  }
}
