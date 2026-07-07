import 'package:flutter/foundation.dart';

class AppConstants {
  // Production Render server base URL
  static const String apiBaseUrl = 'https://hrms-mobile-app.onrender.com/api';
  
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
