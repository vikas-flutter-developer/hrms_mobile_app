class AppUser {
  final String id;
  final String name;
  final String email;
  final String role; // 'superadmin', 'admin', 'hr', 'employee'
  final String? positionLevel; // 'Team Leader', 'Member', etc.
  final String? department;
  final String? empId;
  final String? phone;
  final String? address;
  final String? profilePhoto;
  final String? companyName;
  final String? companyId;
  
  // Shift timing details populated
  final String? shiftName;
  final String? shiftStartTime;
  final String? shiftEndTime;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.positionLevel,
    this.department,
    this.empId,
    this.phone,
    this.address,
    this.profilePhoto,
    this.companyName,
    this.companyId,
    this.shiftName,
    this.shiftStartTime,
    this.shiftEndTime,
  });

  bool get isSuperAdmin => role.toLowerCase() == 'superadmin';
  bool get isAdmin => role.toLowerCase() == 'admin';
  bool get isHR => role.toLowerCase() == 'hr';
  bool get isEmployee => role.toLowerCase() == 'employee';
  
  bool get isManagerRole => isSuperAdmin || isAdmin || isHR || (positionLevel?.toLowerCase().contains('lead') ?? false);

  factory AppUser.fromJson(Map<String, dynamic> json) {
    // Determine shift parameters if populated
    Map<String, dynamic>? shiftData;
    if (json['shift'] is Map) {
      shiftData = Map<String, dynamic>.from(json['shift']);
    }

    // Determine company parameters
    String? resolvedCompanyId;
    String? resolvedCompanyName;
    if (json['company'] is Map) {
      resolvedCompanyId = json['company']['_id']?.toString();
      resolvedCompanyName = json['company']['companyName']?.toString();
    } else if (json['company'] != null) {
      resolvedCompanyId = json['company'].toString();
    }

    // Admin root parameters fallback
    if (resolvedCompanyName == null && json['companyName'] != null) {
      resolvedCompanyName = json['companyName'].toString();
    }

    String resolvedRole = json['role']?.toString() ?? 'employee';
    if (json['role'] == null && json['companyName'] != null) {
      resolvedRole = 'admin';
    }

    return AppUser(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: resolvedRole,
      positionLevel: json['positionLevel']?.toString() ?? (resolvedRole == 'admin' ? 'Administrator' : 'Team Member'),
      department: json['department']?.toString() ?? (resolvedRole == 'admin' ? 'Management' : 'General'),
      empId: json['empId']?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      profilePhoto: json['profilePhoto']?.toString(),
      companyName: resolvedCompanyName,
      companyId: resolvedCompanyId ?? (resolvedRole == 'admin' ? (json['_id']?.toString() ?? json['id']?.toString()) : null),
      shiftName: shiftData?['name']?.toString() ?? json['shiftName']?.toString(),
      shiftStartTime: shiftData?['startTime']?.toString() ?? json['shiftStartTime']?.toString(),
      shiftEndTime: shiftData?['endTime']?.toString() ?? json['shiftEndTime']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'email': email,
    'role': role,
    'positionLevel': positionLevel,
    'department': department,
    'empId': empId,
    'phone': phone,
    'address': address,
    'profilePhoto': profilePhoto,
    'companyName': companyName,
    'company': companyId,
    'shiftName': shiftName,
    'shiftStartTime': shiftStartTime,
    'shiftEndTime': shiftEndTime,
  };
}
