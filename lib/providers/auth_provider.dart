import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../models/app_user.dart';
import '../services/api_service.dart';
import '../config/constants.dart';

class AuthProvider with ChangeNotifier {
  AppUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  
  // 2FA variables
  bool _twoFactorRequired = false;
  String? _temp2FAToken;
  String? _simulatedOTP;

  String? _originalSuperAdminToken;
  String? get originalSuperAdminToken => _originalSuperAdminToken;
  bool get isImpersonating => _originalSuperAdminToken != null;

  AppUser? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get twoFactorRequired => _twoFactorRequired;
  String? get temp2FAToken => _temp2FAToken;
  String? get simulatedOTP => _simulatedOTP;
  bool get isAuthenticated => _currentUser != null;

  final _apiService = ApiService();
  final _storage = const FlutterSecureStorage();

  AuthProvider() {
    // Connect api service unauthorized callback
    _apiService.onUnauthorized = logout;
    _checkSavedSession();
  }

  Future<void> _checkSavedSession() async {
    _isLoading = true;
    notifyListeners();
    try {
      _originalSuperAdminToken = await _storage.read(key: 'hrms_original_superadmin_token');
      final token = await _storage.read(key: AppConstants.tokenKey);
      if (token != null) {
        // Fetch current user details
        await loadProfile();
      }
    } catch (e) {
      print('[Auth] Saved session loading failed: $e');
      await logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProfile() async {
    try {
      final response = await _apiService.get('/employees/profile');
      if (response.statusCode == 200) {
        _currentUser = AppUser.fromJson(response.data);
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> login(String email, String password, String role) async {
    _isLoading = true;
    _errorMessage = null;
    _twoFactorRequired = false;
    _temp2FAToken = null;
    _simulatedOTP = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/auth/login', data: {
        'email': email,
        'password': password,
        'role': role,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        
        if (data['twoFactorRequired'] == true) {
          _twoFactorRequired = true;
          _temp2FAToken = data['tempToken'];
          _simulatedOTP = data['otpSimulation']; // Stored for simulator/testing fallback
          _isLoading = false;
          notifyListeners();
          return false;
        }

        // Successfully logged in directly
        final token = data['token'];
        await _storage.write(key: AppConstants.tokenKey, value: token);
        await loadProfile();
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = _parseError(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    if (_temp2FAToken == null) return false;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/auth/verify-2fa', data: {
        'tempToken': _temp2FAToken,
        'otp': otp,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        final token = data['token'];
        
        await _storage.write(key: AppConstants.tokenKey, value: token);
        await loadProfile();

        _twoFactorRequired = false;
        _temp2FAToken = null;
        _simulatedOTP = null;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = _parseError(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> impersonate(String token) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final currentToken = await _storage.read(key: AppConstants.tokenKey);
      if (currentToken != null) {
        _originalSuperAdminToken = currentToken;
        await _storage.write(key: 'hrms_original_superadmin_token', value: currentToken);
      }
      await _storage.write(key: AppConstants.tokenKey, value: token);
      await loadProfile();
    } catch (e) {
      _errorMessage = _parseError(e);
      await stopImpersonating();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> stopImpersonating() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final originalToken = await _storage.read(key: 'hrms_original_superadmin_token');
      if (originalToken != null) {
        await _storage.write(key: AppConstants.tokenKey, value: originalToken);
        _originalSuperAdminToken = null;
        await _storage.delete(key: 'hrms_original_superadmin_token');
        await loadProfile();
      }
    } catch (e) {
      _errorMessage = _parseError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _currentUser = null;
    _twoFactorRequired = false;
    _temp2FAToken = null;
    _simulatedOTP = null;
    _originalSuperAdminToken = null;
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: 'hrms_original_superadmin_token');
    notifyListeners();
  }

  String _parseError(dynamic e) {
    if (e is DioException) {
      if (e.response != null && e.response!.data is Map) {
        return e.response!.data['message']?.toString() ?? 'Login failed. Please check credentials.';
      }
      return e.message ?? 'Network connection failure.';
    }
    return e.toString();
  }
}
