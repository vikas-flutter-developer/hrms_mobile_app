class AttendanceRecord {
  final String id;
  final String date;
  final String checkIn;
  final String checkOut;
  final String checkInMethod;
  final String checkOutMethod;
  final String status; // 'Present', 'Late', 'Half-Day', 'Absent', etc.
  final double hoursWorked;
  final double overtimeHours;
  final String? regularizationStatus; // 'Pending', 'Approved', 'Rejected', null
  final String? regularizationReason;
  final String? shiftName;

  AttendanceRecord({
    required this.id,
    required this.date,
    required this.checkIn,
    required this.checkOut,
    required this.checkInMethod,
    required this.checkOutMethod,
    required this.status,
    required this.hoursWorked,
    required this.overtimeHours,
    this.regularizationStatus,
    this.regularizationReason,
    this.shiftName,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      checkIn: json['checkIn']?.toString() ?? '',
      checkOut: json['checkOut']?.toString() ?? '',
      checkInMethod: json['checkInMethod']?.toString() ?? '',
      checkOutMethod: json['checkOutMethod']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Absent',
      hoursWorked: (json['hoursWorked'] as num?)?.toDouble() ?? 0.0,
      overtimeHours: (json['overtimeHours'] as num?)?.toDouble() ?? 0.0,
      regularizationStatus: json['regularizationStatus']?.toString(),
      regularizationReason: json['regularizationReason']?.toString(),
      shiftName: json['shiftName']?.toString(),
    );
  }
}

class AttendanceRegularizationRequest {
  final String id;
  final String date;
  final String requestedStatus;
  final String reason;
  final String status; // 'Pending', 'Approved', 'Rejected'
  final String? reviewNote;
  final String employeeName;
  final String employeeEmpId;

  AttendanceRegularizationRequest({
    required this.id,
    required this.date,
    required this.requestedStatus,
    required this.reason,
    required this.status,
    this.reviewNote,
    required this.employeeName,
    required this.employeeEmpId,
  });

  factory AttendanceRegularizationRequest.fromJson(Map<String, dynamic> json) {
    String name = 'Unknown';
    String empId = 'N/A';
    if (json['employee'] is Map) {
      name = json['employee']['name']?.toString() ?? 'Unknown';
      empId = json['employee']['empId']?.toString() ?? 'N/A';
    }

    return AttendanceRegularizationRequest(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      requestedStatus: json['requestedStatus']?.toString() ?? 'Present',
      reason: json['reason']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending',
      reviewNote: json['reviewNote']?.toString(),
      employeeName: name,
      employeeEmpId: empId,
    );
  }
}
