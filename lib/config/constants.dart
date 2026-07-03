import 'package:flutter/foundation.dart';

class AppConstants {
  // Use http://localhost:5000/api for Web/iOS, and http://10.0.2.2:5000/api for Android Emulator
  static const String apiBaseUrl = kIsWeb ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api';
  
  // Storage keys
  static const String tokenKey = 'hrms_jwt_token';
  static const String userRoleKey = 'hrms_user_role';
  static const String userEmailKey = 'hrms_user_email';
  static const String userNameKey = 'hrms_user_name';
  static const String userCompanyKey = 'hrms_user_company';
  
  // Feature modules configuration mapping
  static const List<String> modulesList = [
    'attendance',
    'leave',
    'payroll',
    'performance',
    'recruitment',
    'training',
    'asset',
    'expense',
    'document',
    'chat',
    'announcements'
  ];
}
