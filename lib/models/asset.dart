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
  });

  factory Asset.fromJson(Map<String, dynamic> json) {
    return Asset(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      serialNumber: json['serialNumber']?.toString() ?? '',
      condition: json['condition']?.toString() ?? 'Good',
      status: json['status']?.toString() ?? 'Available',
      purchaseValue: (json['purchaseValue'] as num?)?.toDouble() ?? 0.0,
      nextMaintenanceDate: json['nextMaintenanceDate']?.toString(),
      returnDate: json['returnDate']?.toString(),
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
  final String status; // 'Reported', 'Under Repair', 'Resolved'
  final double repairCost;
  final String employeeName;
  final String employeeEmpId;

  AssetDamageModel({
    required this.id,
    required this.assetName,
    required this.serialNumber,
    required this.description,
    required this.status,
    required this.repairCost,
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

    return AssetDamageModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      assetName: aName,
      serialNumber: sNumber,
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Reported',
      repairCost: (json['repairCost'] as num?)?.toDouble() ?? 0.0,
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
