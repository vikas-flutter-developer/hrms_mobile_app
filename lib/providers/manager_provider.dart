import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/attendance.dart';
import '../models/leave.dart';
import '../models/payroll.dart';
import '../models/asset.dart';

class ManagerProvider with ChangeNotifier {
  final _api = ApiService();
  bool _isLoading = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // --- Approvals lists ---
  List<AttendanceRegularizationRequest> _pendingRegularizations = [];
  List<LeaveRequest> _pendingLeaves = [];
  List<Map<String, dynamic>> _pendingExpenses = [];
  List<LoanRequest> _pendingLoans = [];

  List<AttendanceRegularizationRequest> get pendingRegularizations => _pendingRegularizations;
  List<LeaveRequest> get pendingLeaves => _pendingLeaves;
  List<Map<String, dynamic>> get pendingExpenses => _pendingExpenses;
  List<LoanRequest> get pendingLoans => _pendingLoans;

  // --- ATS State ---
  List<Map<String, dynamic>> _interviews = [];
  List<Map<String, dynamic>> get interviews => _interviews;

  // --- Offboarding Checklist State ---
  List<OffboardingAssetItem> _offboardingQueue = [];
  List<OffboardingAssetItem> get offboardingQueue => _offboardingQueue;

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String? msg) {
    _errorMessage = msg;
    notifyListeners();
  }

  // ==========================================
  // 📥 FETCH PENDING APPROVALS
  // ==========================================

  Future<void> fetchPendingRegularizations() async {
    _setLoading(true);
    try {
      final response = await _api.get('/attendance/regularization');
      if (response.statusCode == 200) {
        _pendingRegularizations = (response.data as List)
            .map((x) => AttendanceRegularizationRequest.fromJson(x))
            .where((x) => x.status == 'Pending')
            .toList();
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resolveRegularization(String id, String status, String reviewNote) async {
    _setError(null);
    try {
      final response = await _api.put('/attendance/regularization/$id', data: {
        'status': status, // 'Approved' or 'Rejected'
        'reviewNote': reviewNote,
      });
      if (response.statusCode == 200) {
        await fetchPendingRegularizations();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchPendingLeaves() async {
    _setLoading(true);
    try {
      final response = await _api.get('/leaves/pending-reviews');
      if (response.statusCode == 200) {
        _pendingLeaves = (response.data as List).map((x) => LeaveRequest.fromJson(x)).toList();
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resolveLeave(String id, String action) async {
    _setError(null);
    try {
      final response = await _api.patch('/leaves/$id/action', data: {
        'status': action, // 'Approved' or 'Rejected'
      });
      if (response.statusCode == 200) {
        await fetchPendingLeaves();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchPendingExpenses() async {
    _setLoading(true);
    try {
      final response = await _api.get('/expenses');
      if (response.statusCode == 200) {
        _pendingExpenses = (response.data as List)
            .map((x) => Map<String, dynamic>.from(x))
            .where((x) => x['status'] == 'Pending')
            .toList();
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resolveExpense(String id, String status) async {
    _setError(null);
    try {
      final response = await _api.put('/expenses/$id/status', data: {
        'status': status, // 'Approved' or 'Rejected'
      });
      if (response.statusCode == 200) {
        await fetchPendingExpenses();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  Future<void> fetchPendingLoans() async {
    _setLoading(true);
    try {
      final response = await _api.get('/payroll/loans');
      if (response.statusCode == 200) {
        _pendingLoans = (response.data as List)
            .map((x) => LoanRequest.fromJson(x))
            .where((x) => x.status == 'Pending')
            .toList();
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resolveLoan(String id, String status) async {
    _setError(null);
    try {
      final response = await _api.patch('/payroll/loans/$id', data: {
        'status': status, // 'Approved' or 'Rejected'
      });
      if (response.statusCode == 200) {
        await fetchPendingLoans();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 🎯 ATS & INTERVIEWS
  // ==========================================

  Future<void> fetchInterviews() async {
    try {
      final response = await _api.get('/recruitment/interviews');
      if (response.statusCode == 200) {
        _interviews = List<Map<String, dynamic>>.from(response.data);
        notifyListeners();
      }
    } catch (e) {
      print('Fetch interviews error: $e');
    }
  }

  Future<bool> submitInterviewFeedback(String id, String feedback, double rating, String status, {String? candidateVerdict, String? candidateId}) async {
    _setError(null);
    try {
      final dataPayload = {
        'feedback': feedback,
        'rating': rating,
        'status': status, // 'Completed', 'Cancelled'
      };
      if (candidateVerdict != null && candidateId != null) {
        dataPayload['candidateVerdict'] = candidateVerdict; // e.g. 'Offered', 'Rejected'
        dataPayload['candidateId'] = candidateId;
      }

      final response = await _api.put('/recruitment/interviews/$id', data: dataPayload);
      if (response.statusCode == 200) {
        await fetchInterviews();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }

  // ==========================================
  // 🚪 OFFBOARDING ASSET CHECKS
  // ==========================================

  Future<void> fetchOffboardingQueue() async {
    try {
      final response = await _api.get('/assets/offboarding-queue');
      if (response.statusCode == 200) {
        _offboardingQueue = (response.data as List).map((x) => OffboardingAssetItem.fromJson(x)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Offboarding queue error: $e');
    }
  }

  Future<bool> confirmAssetReturned(String assetId, String condition) async {
    _setError(null);
    try {
      final response = await _api.post('/assets/$assetId/return', data: {
        'condition': condition, // 'Good', 'Fair', 'Poor'
      });
      if (response.statusCode == 200) {
        await fetchOffboardingQueue();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }
}
