class Asset {
  final String id;
  final String name;
  final String category;
  final String serialNumber;
  final String condition; // 'New', 'Good', 'Fair', 'Poor'
  final String status; // 'Available', 'Assigned', 'Maintenance'
  final double purchaseValue;
  final String? nextMaintenanceDate;
  final String? returnDate;
  final String? assignedToName;
  final String? assignedToEmpId;
  final String? assignedToDept;

  Asset({
    required this.id,
    required this.name,
    required this.category,
    required this.serialNumber,
    required this.condition,
    required this.status,
    required this.purchaseValue,
    this.nextMaintenanceDate,
    this.returnDate,
    this.assignedToName,
    this.assignedToEmpId,
    this.assignedToDept,
  });

  static double _parseDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }

  factory Asset.fromJson(Map<String, dynamic> json) {
    String? name;
    String? empId;
    String? dept;
    if (json['assignedTo'] is Map) {
      name = json['assignedTo']['name']?.toString();
      empId = json['assignedTo']['empId']?.toString();
      dept = json['assignedTo']['department']?.toString();
    }

    return Asset(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      serialNumber: json['serialNumber']?.toString() ?? '',
      condition: json['condition']?.toString() ?? 'Good',
      status: json['status']?.toString() ?? 'Available',
      purchaseValue: _parseDouble(json['purchaseValue']),
      nextMaintenanceDate: json['nextMaintenanceDate']?.toString(),
      returnDate: json['returnDate']?.toString(),
      assignedToName: name,
      assignedToEmpId: empId,
      assignedToDept: dept,
    );
  }
}

class AssetRequestModel {
  final String id;
  final String assetType;
  final String reason;
  final String urgency; // 'Low', 'Medium', 'High'
  final String status; // 'Pending', 'Approved', 'Rejected'
  final String? adminNotes;
  final String employeeName;
  final String employeeEmpId;

  AssetRequestModel({
    required this.id,
    required this.assetType,
    required this.reason,
    required this.urgency,
    required this.status,
    this.adminNotes,
    required this.employeeName,
    required this.employeeEmpId,
  });

  factory AssetRequestModel.fromJson(Map<String, dynamic> json) {
    String name = 'Unknown';
    String empId = 'N/A';
    if (json['employeeId'] is Map) {
      name = json['employeeId']['name']?.toString() ?? 'Unknown';
      empId = json['employeeId']['empId']?.toString() ?? 'N/A';
    }

    return AssetRequestModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      assetType: json['assetType']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      urgency: json['urgency']?.toString() ?? 'Medium',
      status: json['status']?.toString() ?? 'Pending',
      adminNotes: json['adminNotes']?.toString(),
      employeeName: name,
      employeeEmpId: empId,
    );
  }
}

class AssetDamageModel {
  final String id;
  final String assetName;
  final String serialNumber;
  final String description;
  final String status; // 'Reported', 'In Repair', 'Resolved'
  final double repairCost;
  final String paymentMode; // 'Salary Deduction', 'Lump Sum Payment', 'Company Covered'
  final bool isDeductedFromSalary;
  final String employeeName;
  final String employeeEmpId;

  AssetDamageModel({
    required this.id,
    required this.assetName,
    required this.serialNumber,
    required this.description,
    required this.status,
    required this.repairCost,
    required this.paymentMode,
    required this.isDeductedFromSalary,
    required this.employeeName,
    required this.employeeEmpId,
  });

  factory AssetDamageModel.fromJson(Map<String, dynamic> json) {
    String name = 'Unknown';
    String empId = 'N/A';
    if (json['employeeId'] is Map) {
      name = json['employeeId']['name']?.toString() ?? 'Unknown';
      empId = json['employeeId']['empId']?.toString() ?? 'N/A';
    }

    String aName = 'Asset';
    String sNumber = 'N/A';
    if (json['assetId'] is Map) {
      aName = json['assetId']['name']?.toString() ?? 'Asset';
      sNumber = json['assetId']['serialNumber']?.toString() ?? 'N/A';
    }

    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    return AssetDamageModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      assetName: aName,
      serialNumber: sNumber,
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Reported',
      repairCost: parseDouble(json['repairCost']),
      paymentMode: json['paymentMode']?.toString() ?? 'Company Covered',
      isDeductedFromSalary: json['isDeductedFromSalary'] == true,
      employeeName: name,
      employeeEmpId: empId,
    );
  }
}

class OffboardingAssetItem {
  final String dbId;
  final String id; // serial number
  final String empName;
  final String role;
  final int itemsToCollect;
  final String exitDate;
  final String status; // 'Recovered', 'Pending'

  OffboardingAssetItem({
    required this.dbId,
    required this.id,
    required this.empName,
    required this.role,
    required this.itemsToCollect,
    required this.exitDate,
    required this.status,
  });

  factory OffboardingAssetItem.fromJson(Map<String, dynamic> json) {
    return OffboardingAssetItem(
      dbId: json['dbId']?.toString() ?? '',
      id: json['id']?.toString() ?? '',
      empName: json['empName']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      itemsToCollect: (json['itemsToCollect'] as num?)?.toInt() ?? 1,
      exitDate: json['exitDate']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Pending',
    );
  }
}
