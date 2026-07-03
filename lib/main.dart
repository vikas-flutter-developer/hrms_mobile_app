import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Providers
import 'providers/auth_provider.dart';
import 'providers/hr_provider.dart';
import 'providers/manager_provider.dart';

// Screens
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/home_screen.dart';
import 'screens/attendance/clock_screen.dart';
import 'screens/leaves/leave_portal_screen.dart';
import 'screens/finances/payslips_screen.dart';
import 'screens/finances/loans_screen.dart';
import 'screens/expenses/expense_claim_screen.dart';
import 'screens/profile/directory_screen.dart';
import 'screens/helpdesk/helpdesk_screen.dart';
import 'screens/chat/chat_screen.dart';
import 'screens/manager/manager_dashboard.dart';
import 'screens/training/training_screen.dart';
import 'screens/attendance/staff_attendance_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HrmsApp());
}

class HrmsApp extends StatelessWidget {
  const HrmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => HrProvider()),
        ChangeNotifierProvider(create: (_) => ManagerProvider()),
      ],
      child: MaterialApp(
        title: 'Enterprise HRMS',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: 'Inter',
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF3B82F6), // Blue 500
            brightness: Brightness.light,
            background: const Color(0xFFF8FAFC), // Slate 50
            surface: Colors.white,
          ),
          appBarTheme: const AppBarTheme(
            elevation: 0,
            scrolledUnderElevation: 0,
            centerTitle: true,
            backgroundColor: Colors.white,
            foregroundColor: Color(0xFF0F172A),
            iconTheme: IconThemeData(color: Color(0xFF0F172A)),
            titleTextStyle: TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        home: const AuthWrapper(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
          '/clock': (context) => const ClockScreen(),
          '/leaves': (context) => const LeavePortalScreen(),
          '/payslips': (context) => const PayslipsScreen(),
          '/loans': (context) => const LoansScreen(),
          '/expenses': (context) => const ExpenseClaimScreen(),
          '/directory': (context) => const DirectoryScreen(),
          '/helpdesk': (context) => const HelpdeskScreen(),
          '/chat': (context) => const ChatScreen(),
          '/learning': (context) => const TrainingScreen(),
          '/manager_dashboard': (context) => const ManagerDashboard(),
          '/staff_attendance': (context) => const StaffAttendanceScreen(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isLoading && auth.currentUser == null) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (auth.isAuthenticated) {
          return const HomeScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
