class Payslip {
  final String id;
  final String month;
  final double basicPay;
  final double hra;
  final double specialAllowance;
  final double bonus;
  final double incentives;
  final double gratuity;
  final double overtimePay;
  final double pfDeduction;
  final double esiDeduction;
  final double professionalTax;
  final double tds;
  final double lopDeduction;
  final double loanEmi;
  final double netPay;
  final String status; // 'Processed', 'Paid'
  final String? paymentDate;
  final String? employeeName;
  final String? employeeEmpId;
  final String? employeeDepartment;

  Payslip({
    required this.id,
    required this.month,
    required this.basicPay,
    required this.hra,
    required this.specialAllowance,
    required this.bonus,
    required this.incentives,
    required this.gratuity,
    required this.overtimePay,
    required this.pfDeduction,
    required this.esiDeduction,
    required this.professionalTax,
    required this.tds,
    required this.lopDeduction,
    required this.loanEmi,
    required this.netPay,
    required this.status,
    this.paymentDate,
    this.employeeName,
    this.employeeEmpId,
    this.employeeDepartment,
  });

  factory Payslip.fromJson(Map<String, dynamic> json) {
    String? name;
    String? empId;
    String? dept;
    if (json['employeeId'] is Map) {
      name = json['employeeId']['name']?.toString();
      empId = json['employeeId']['empId']?.toString();
      dept = json['employeeId']['department']?.toString();
    }

    return Payslip(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      month: json['month']?.toString() ?? '',
      basicPay: (json['basicPay'] as num?)?.toDouble() ?? 0.0,
      hra: (json['hra'] as num?)?.toDouble() ?? 0.0,
      specialAllowance: (json['specialAllowance'] as num?)?.toDouble() ?? 0.0,
      bonus: (json['bonus'] as num?)?.toDouble() ?? 0.0,
      incentives: (json['incentives'] as num?)?.toDouble() ?? 0.0,
      gratuity: (json['gratuity'] as num?)?.toDouble() ?? 0.0,
      overtimePay: (json['overtimePay'] as num?)?.toDouble() ?? 0.0,
      pfDeduction: (json['pfDeduction'] as num?)?.toDouble() ?? 0.0,
      esiDeduction: (json['esiDeduction'] as num?)?.toDouble() ?? 0.0,
      professionalTax: (json['professionalTax'] as num?)?.toDouble() ?? 0.0,
      tds: (json['tds'] as num?)?.toDouble() ?? 0.0,
      lopDeduction: (json['lopDeduction'] as num?)?.toDouble() ?? 0.0,
      loanEmi: (json['loanEmi'] as num?)?.toDouble() ?? 0.0,
      netPay: (json['netPay'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'Processed',
      paymentDate: json['paymentDate']?.toString(),
      employeeName: name,
      employeeEmpId: empId,
      employeeDepartment: dept,
    );
  }
}

class LoanRequest {
  final String id;
  final double amount;
  final String reason;
  final double emiAmount;
  final double balanceRemaining;
  final String status; // 'Pending', 'Approved', 'Rejected', 'Closed'
  final String employeeName;
  final String employeeEmpId;

  LoanRequest({
    required this.id,
    required this.amount,
    required this.reason,
    required this.emiAmount,
    required this.balanceRemaining,
    required this.status,
    required this.employeeName,
    required this.employeeEmpId,
  });

  factory LoanRequest.fromJson(Map<String, dynamic> json) {
    String name = 'Unknown';
    String empId = 'N/A';
    if (json['employeeId'] is Map) {
      name = json['employeeId']['name']?.toString() ?? 'Unknown';
      empId = json['employeeId']['empId']?.toString() ?? 'N/A';
    }

    return LoanRequest(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      reason: json['reason']?.toString() ?? '',
      emiAmount: (json['emiAmount'] as num?)?.toDouble() ?? 0.0,
      balanceRemaining: (json['balanceRemaining'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'Pending',
      employeeName: name,
      employeeEmpId: empId,
    );
  }
}
