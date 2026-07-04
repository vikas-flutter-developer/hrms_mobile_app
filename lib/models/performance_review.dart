class PerformanceReviewModel {
  final String id;
  final String employeeName;
  final String employeeEmpId;
  final String employeeDepartment;
  final String cycleName;
  final int rating;
  final String status;
  final String overallComments;
  final String reviewerName;
  final String updatedAt;

  PerformanceReviewModel({
    required this.id,
    required this.employeeName,
    required this.employeeEmpId,
    required this.employeeDepartment,
    required this.cycleName,
    required this.rating,
    required this.status,
    required this.overallComments,
    required this.reviewerName,
    required this.updatedAt,
  });

  factory PerformanceReviewModel.fromJson(Map<String, dynamic> json) {
    // Extract employee details
    final emp = json['employee'] as Map<String, dynamic>?;
    final empName = emp != null ? emp['name']?.toString() ?? 'Staff Member' : 'Staff Member';
    final empId = emp != null ? emp['empId']?.toString() ?? 'N/A' : 'N/A';
    final empDept = emp != null ? emp['department']?.toString() ?? 'General' : 'General';

    // Extract cycle details
    final cycle = json['cycle'] as Map<String, dynamic>?;
    final cycleName = cycle != null ? cycle['name']?.toString() ?? 'Quarterly Cycle' : 'Quarterly Cycle';

    // Extract reviewer details
    final rev = json['reviewer'] as Map<String, dynamic>?;
    final revName = rev != null ? rev['name']?.toString() ?? 'Manager' : 'Manager';

    return PerformanceReviewModel(
      id: json['_id']?.toString() ?? '',
      employeeName: empName,
      employeeEmpId: empId,
      employeeDepartment: empDept,
      cycleName: cycleName,
      rating: json['rating'] is num ? (json['rating'] as num).toInt() : 4,
      status: json['status']?.toString() ?? 'Draft',
      overallComments: json['overallComments']?.toString() ?? '',
      reviewerName: revName,
      updatedAt: json['updatedAt']?.toString() ?? '',
    );
  }
}
