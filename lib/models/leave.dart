class LeaveRequest {
  final String id;
  final String type; // 'Casual', 'Medical', 'Paid', 'Resignation', etc.
  final String startDate;
  final String endDate;
  final int days;
  final String reason;
  final String status; // 'Pending', 'Approved', 'Rejected'
  final bool isLOP; // Loss of pay flag
  final String employeeName;
  final String employeeEmpId;
  final String? actionedByName;

  LeaveRequest({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.reason,
    required this.status,
    this.isLOP = false,
    required this.employeeName,
    required this.employeeEmpId,
    this.actionedByName,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    String name = 'Unknown';
    String empId = 'N/A';
    if (json['employeeId'] is Map) {
      name = json['employeeId']['name']?.toString() ?? 'Unknown';
      empId = json['employeeId']['empId']?.toString() ?? 'N/A';
    }

    return LeaveRequest(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'Casual',
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['endDate']?.toString() ?? '',
      days: (json['days'] as num?)?.toInt() ?? 0,
      reason: json['reason']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending',
      isLOP: json['isLOP'] as bool? ?? json['isLossOfPay'] as bool? ?? false,
      employeeName: name,
      employeeEmpId: empId,
      actionedByName: json['actionedByName']?.toString(),
    );
  }
}

class LeaveBalances {
  final int casual;
  final int medical;
  final int paid;

  LeaveBalances({
    required this.casual,
    required this.medical,
    required this.paid,
  });

  factory LeaveBalances.fromJson(Map<String, dynamic> json) {
    return LeaveBalances(
      casual: (json['casual'] as num?)?.toInt() ?? 0,
      medical: (json['medical'] as num?)?.toInt() ?? 0,
      paid: (json['paid'] as num?)?.toInt() ?? 0,
    );
  }
}

class Holiday {
  final String id;
  final String name;
  final String date;
  final String type; // 'National', 'Optional'
  final String state;
  final String description;

  Holiday({
    required this.id,
    required this.name,
    required this.date,
    required this.type,
    required this.state,
    required this.description,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      type: json['type']?.toString() ?? 'National',
      state: json['state']?.toString() ?? 'All',
      description: json['description']?.toString() ?? '',
    );
  }
}
