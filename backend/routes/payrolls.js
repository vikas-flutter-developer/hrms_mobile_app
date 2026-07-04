const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');
const Attendance = require('../models/Attendance');
const checkPermission = require('../middleware/rbac');

// ==========================================
// 📋 GET: FETCH ALL PAYSLIPS FOR A GIVEN MONTH
// ==========================================
router.get('/', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      month
    } = req.query; // e.g., "May 2026"
    const query = {
      company: req.user.company
    };
    if (month) query.month = month;
    const payslips = await Payslip.find({
      ...query,
      company: req.user.company
    }).populate({ 
      path: 'employeeId', 
      select: 'name empId department role bankName accountNumber panNumber shift',
      populate: { path: 'shift', select: 'name startTime endTime' }
    }).sort({
      createdAt: -1
    });
    res.status(200).json(payslips);
  } catch (error) {
    console.error("Error fetching payslips:", error);
    res.status(500).json({
      message: "Failed to fetch payroll records."
    });
  }
});
// GET /api/payroll/my-payslips
router.get('/my-payslips', verifyToken, async (req, res) => {
  try {
    const payslips = await Payslip.find({
      company: req.user.company,
      employeeId: req.user.id
    }).populate({ 
      path: 'employeeId', 
      select: 'name empId department role bankName accountNumber panNumber shift',
      populate: { path: 'shift', select: 'name startTime endTime' }
    }).sort({
      createdAt: -1
    });
    res.status(200).json(payslips);
  } catch (error) {
    console.error("Error fetching my payslips:", error);
    res.status(500).json({
      message: "Failed to fetch your payroll records."
    });
  }
});
// ==========================================
// ✏️ POST: CREATE MANUAL PAYSLIP FOR AN INDIVIDUAL EMPLOYEE
// ==========================================
router.post('/create-manual', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      employeeId,
      month,
      basicPay = 0,
      hra = 0,
      specialAllowance = 0,
      bonus = 0,
      incentives = 0,
      overtimePay = 0,
      pfDeduction = 0,
      esiDeduction = 0,
      professionalTax = 0,
      tds = 0,
      lopDeduction = 0,
      loanEmi = 0,
      status = 'Paid'
    } = req.body;

    if (!employeeId || !month) {
      return res.status(400).json({ message: "Employee and Month are required." });
    }

    const earnings = Number(basicPay) + Number(hra) + Number(specialAllowance) + Number(bonus) + Number(incentives) + Number(overtimePay);
    const deductions = Number(pfDeduction) + Number(esiDeduction) + Number(professionalTax) + Number(tds) + Number(lopDeduction) + Number(loanEmi);
    const netPay = Math.max(0, earnings - deductions);

    const payslip = new Payslip({
      company: req.user.company,
      employeeId,
      month,
      basicPay: Number(basicPay),
      hra: Number(hra),
      specialAllowance: Number(specialAllowance),
      bonus: Number(bonus),
      incentives: Number(incentives),
      overtimePay: Number(overtimePay),
      pfDeduction: Number(pfDeduction),
      esiDeduction: Number(esiDeduction),
      professionalTax: Number(professionalTax),
      tds: Number(tds),
      lopDeduction: Number(lopDeduction),
      loanEmi: Number(loanEmi),
      netPay,
      status,
      paymentDate: new Date()
    });

    await payslip.save();
    const populated = await Payslip.findById(payslip._id).populate('employeeId', 'name empId department');
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating manual payslip:", error);
    res.status(500).json({ message: "Failed to create manual payslip: " + error.message });
  }
});

// ==========================================
// 🚀 POST: RUN MONTHLY PAYROLL
// ==========================================
router.post('/run-payroll', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      month,
      configs,
      overtimeMultiplier = 1.0
    } = req.body;
    // configs is an optional object: { [employeeId]: { bonus, incentives, gratuity } }
    if (!month) return res.status(400).json({
      message: "Target month is required (e.g., 'May 2026')."
    });
    const existingRun = await Payslip.findOne({
      company: req.user.company,
      month
    });
    if (existingRun) {
      await Payslip.deleteMany({
        company: req.user.company,
        month
      });
    }
    const employees = await Employee.find({
      company: req.user.company,
      status: {
        $ne: 'Archived'
      }
    });
    if (employees.length === 0) {
      return res.status(404).json({
        message: "No active employees found to run payroll."
      });
    }

    // Convert "June 2026" to "2026-06" for attendance regex
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [monthName, year] = month.split(' ');
    const monthIndex = monthNames.indexOf(monthName) + 1;
    const monthPrefix = `${year}-${monthIndex.toString().padStart(2, '0')}`;

    const CustomRole = require('../models/CustomRole');
    const customRoles = await CustomRole.find({ company: req.user.company });
    const designationMap = {};
    for (const role of customRoles) {
      designationMap[role.title] = role;
    }

    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne({ company: req.user.company });
    const pSettings = settings?.payrollSettings || { includeHolidays: true, includeLeaves: true, basis: 'flat_30', enabledComponents: [] };
    const enabledComponents = pSettings.enabledComponents || [];
    const isComponentEnabled = (name) => {
      if (!enabledComponents.length) return true; // Default to all if none selected/empty
      return enabledComponents.some(comp => comp.toLowerCase() === name.toLowerCase());
    };

    const payslipsToGenerate = [];
    for (const emp of employees) {
      const ctc = emp.salary || emp.baseSalary || 60000;
      
      let basicPay = ctc * 0.40;
      let hra = basicPay * 0.50;
      let specialAllowance = ctc - (basicPay + hra);

      if (!isComponentEnabled('Basic Salary') && !isComponentEnabled('Basic')) basicPay = 0;
      if (!isComponentEnabled('HRA')) hra = 0;
      if (!isComponentEnabled('Special Allowance')) specialAllowance = 0;

      // Fetch Department-wise configs
      const deptConfig = configs && configs[emp.department] ? configs[emp.department] : {};
      const bonus = Number(deptConfig.bonus) || 0;
      
      // Auto-calculated from Employee profile and Designation
      const employeeDesignation = designationMap[emp.positionLevel] || {};
      const gratuityPercentage = employeeDesignation.gratuityPercentage || emp.gratuityPercentage || 0;
      
      let gratuity = Math.round((ctc * gratuityPercentage) / 100);
      if (!isComponentEnabled('Gratuity')) gratuity = 0;

      let incentives = Math.round((ctc * (emp.incentivePercentage || 0)) / 100);
      if (!isComponentEnabled('Incentives')) incentives = 0;

      // Automatically calculate overtime from attendance
      const attendanceRecords = await Attendance.find({
        company: req.user.company,
        employeeId: emp._id,
        date: { $regex: `^${monthPrefix}` }
      });
      const totalOvertimeHours = attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
      const hourlyRate = ctc / (30 * 8); // simplified hourly rate
      
      let overtimePay = Math.round(hourlyRate * totalOvertimeHours * overtimeMultiplier);
      if (!isComponentEnabled('Overtime')) overtimePay = 0;

      // Absent Deductions (LOP)
      const [year, mth] = monthPrefix.split('-');
      const targetMonthEnd = new Date(year, mth, 0); 
      const today = new Date();
      const calcEnd = targetMonthEnd > today ? today : targetMonthEnd;
      
      let calcStart = new Date(year, mth - 1, 1);
      const joinDate = new Date(emp.createdAt || calcStart);
      if (joinDate > calcStart) calcStart = joinDate;
      
      let expectedWorkingDays = 0;
      for (let d = new Date(calcStart); d <= calcEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) expectedWorkingDays++; // Exclude Sundays
      }
      
      const Holiday = require('../models/Holiday');
      const holidaysInRange = await Holiday.find({
        company: req.user.company,
        isActive: true,
        date: { 
          $gte: new Date(calcStart).toISOString().split('T')[0],
          $lte: new Date(calcEnd).toISOString().split('T')[0]
        }
      });
      for (const h of holidaysInRange) {
        if (new Date(h.date).getDay() !== 0) expectedWorkingDays--;
      }
      
      const presentDays = attendanceRecords.filter(r => ['Present', 'Late'].includes(r.status)).length +
                           (attendanceRecords.filter(r => r.status === 'Half-Day').length * 0.5);
      const holidayPaid = pSettings.includeHolidays ? holidaysInRange.length : 0;
      const leavePaid = pSettings.includeLeaves ? attendanceRecords.filter(r => r.status === 'Leave').length : 0;
      
      const totalPaidDays = presentDays + holidayPaid + leavePaid;
      
      let basisDays = 30;
      if (pSettings.basis === 'actual_month_days') {
        basisDays = targetMonthEnd.getDate();
      } else if (pSettings.basis === 'working_days') {
        basisDays = expectedWorkingDays;
      }
      if (!basisDays || basisDays < 1) basisDays = 30; // Prevent division-by-zero and NaN
      
      const totalEarnings = basicPay + hra + specialAllowance + bonus + incentives + gratuity + overtimePay;
      
      const paidRatio = (attendanceRecords.length === 0) ? 1.0 : (Math.min(basisDays, totalPaidDays) / basisDays);
      const actualSalary = totalEarnings * paidRatio;
      const lopDeduction = Math.max(0, Math.round(totalEarnings - actualSalary));

      // Handle Loans / EMIs
      let loanEmi = 0;
      const activeLoans = await Loan.find({
        company: req.user.company,
        employeeId: emp._id,
        status: 'Approved',
        balanceRemaining: {
          $gt: 0
        }
      });
      for (const loan of activeLoans) {
        // Determine deduction amount (min of EMI or remaining balance)
        const deduction = Math.min(loan.emiAmount, loan.balanceRemaining);
        loanEmi += deduction;

        // We update loan balance directly here
        loan.balanceRemaining -= deduction;
        if (loan.balanceRemaining <= 0) {
          loan.status = 'Closed';
        }
        await loan.save();
      }

      // Scale deductions based on actual earned salary components (present days)
      const actualBasicPay = basicPay * paidRatio;
      const actualCtc = ctc * paidRatio;

      // Deductions
      let pfDeduction = actualBasicPay * 0.12;
      if (!isComponentEnabled('PF') && !isComponentEnabled('EPF')) pfDeduction = 0;

      let esiDeduction = actualCtc <= 21000 && actualCtc > 0 ? actualCtc * 0.0075 : 0;
      if (!isComponentEnabled('ESI')) esiDeduction = 0;

      let professionalTax = actualCtc > 0 ? 200 : 0;
      if (!isComponentEnabled('Professional Tax')) professionalTax = 0;

      let tds = actualCtc > 50000 ? actualCtc * 0.10 : 0;
      if (!isComponentEnabled('TDS')) tds = 0;

      const totalDeductions = pfDeduction + esiDeduction + professionalTax + tds + lopDeduction + loanEmi;
      const netPay = Math.max(0, Math.round(totalEarnings - totalDeductions));
      payslipsToGenerate.push({
        company: req.user.company,
        employeeId: emp._id,
        month,
        basicPay,
        hra,
        da: 0,
        specialAllowance,
        bonus,
        incentives,
        gratuity,
        overtimePay,
        pfDeduction,
        esiDeduction,
        professionalTax,
        tds,
        lopDeduction,
        loanEmi,
        netPay,
        status: 'Processed'
      });
    }
    const savedPayslips = await Payslip.insertMany(payslipsToGenerate);
    res.status(201).json({
      message: `Successfully ran payroll for ${month}. Generated ${savedPayslips.length} payslips.`,
      count: savedPayslips.length
    });
  } catch (error) {
    console.error("Payroll generation error:", error);
    res.status(500).json({
      message: "Internal server error during payroll execution."
    });
  }
});

// ==========================================
// 💳 PATCH: MARK PAYSLIP AS PAID
// ==========================================
router.patch('/:id/pay', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const payslip = await Payslip.findByIdAndUpdate(req.params.id, {
      status: 'Paid',
      paymentDate: new Date()
    }, {
      new: true
    }).populate('employeeId', 'name empId');
    if (!payslip) return res.status(404).json({
      message: "Payslip record not found."
    });

    // 🔔 NOTIFICATION: Announce Salary Paid to Employee
    try {
      const Announcement = require('../models/Announcement');
      const newAnnouncement = new Announcement({
        company: payslip.company || req.user.company,
        title: 'Salary Paid',
        message: `Your salary for ${payslip.month || 'this month'} has been processed and paid.`,
        targetAudience: 'Specific Users',
        targetUsers: [payslip.employeeId._id || payslip.employeeId],
        createdBy: req.user.id
      });
      await newAnnouncement.save();
    } catch (announcementErr) {
      console.error("Failed to push salary payment announcement:", announcementErr);
    }
    res.status(200).json({
      message: "Payment status updated to Paid.",
      payslip
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update payment status."
    });
  }
});

// ==========================================
// 🏦 LOANS MANAGEMENT
// ==========================================
router.get('/loans', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    const query = { company: req.user.company };
    if (userRole === 'employee') {
      query.employeeId = req.user.id;
    }
    const loans = await Loan.find(query).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    });
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch loans."
    });
  }
});
router.post('/loans', verifyToken, async (req, res) => {
  try {
    let {
      employeeId,
      amount,
      reason,
      emiAmount
    } = req.body;
    
    // 🛡️ IDOR Fix: Force self-assignment for standard employees
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'superadmin') {
      employeeId = req.user.id;
    }

    if (!employeeId || !amount || !emiAmount) {
      return res.status(400).json({
        message: "Missing required fields."
      });
    }
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    const isManagerRole = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';

    const newLoan = new Loan({
      company: req.user.company,
      employeeId,
      amount: Number(amount),
      reason,
      emiAmount: Number(emiAmount),
      balanceRemaining: Number(amount),
      status: isManagerRole ? 'Approved' : 'Pending',
      ...(isManagerRole ? { disbursementDate: new Date(), approvedBy: req.user.id } : {})
    });
    await newLoan.save();
    const populated = await newLoan.populate('employeeId', 'name empId department');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({
      message: "Failed to request loan."
    });
  }
});
router.patch('/loans/:id', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      status
    } = req.body;
    const loan = await Loan.findByIdAndUpdate(req.params.id, {
      status,
      ...(status === 'Approved' ? {
        disbursementDate: new Date()
      } : {})
    }, {
      new: true
    });
    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update loan status."
    });
  }
});

// ==========================================
// 📊 PAYROLL REPORTS
// ==========================================

// GET: Bank Transfer Sheet - all employees with bank account + net salary for current month
router.get('/reports/bank-transfer', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      month
    } = req.query;
    const query = {
      company: req.user.company
    };
    if (month) query.month = month;
    const payslips = await Payslip.find({
      ...query,
      company: req.user.company
    }).populate('employeeId', 'name empId bankName accountNumber ifscCode department').sort({
      createdAt: -1
    });
    const data = payslips.map(slip => ({
      EmployeeName: slip.employeeId?.name || 'Unknown',
      EmpID: slip.employeeId?.empId || '',
      Department: slip.employeeId?.department || '',
      BankName: slip.employeeId?.bankName || '',
      AccountNumber: slip.employeeId?.accountNumber || '',
      IFSCCode: slip.employeeId?.ifscCode || '',
      NetPay: slip.netPay || 0,
      Month: slip.month || '',
      Status: slip.status || 'Processed'
    }));
    res.status(200).json(data);
  } catch (error) {
    console.error('Bank transfer report error:', error);
    res.status(500).json({
      message: 'Failed to generate bank transfer report.'
    });
  }
});

// GET: PF Register - all employees with PF deduction amounts
router.get('/reports/pf-register', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      month
    } = req.query;
    const query = {
      company: req.user.company
    };
    if (month) query.month = month;
    const payslips = await Payslip.find({
      ...query,
      company: req.user.company
    }).populate('employeeId', 'name empId uanNumber department').sort({
      createdAt: -1
    });
    const data = payslips.map(slip => ({
      EmployeeName: slip.employeeId?.name || 'Unknown',
      EmpID: slip.employeeId?.empId || '',
      UANNumber: slip.employeeId?.uanNumber || '',
      Department: slip.employeeId?.department || '',
      BasicPay: slip.basicPay || 0,
      EmployeePF: slip.pfDeduction || 0,
      EmployerPF: slip.pfDeduction || 0,
      TotalPF: (slip.pfDeduction || 0) * 2,
      Month: slip.month || ''
    }));
    res.status(200).json(data);
  } catch (error) {
    console.error('PF register error:', error);
    res.status(500).json({
      message: 'Failed to generate PF register.'
    });
  }
});

// GET: TDS Register - all employees with TDS amounts
router.get('/reports/tds-register', verifyToken, checkPermission('manage_payroll'), async (req, res) => {
  try {
    const {
      month
    } = req.query;
    const query = {
      company: req.user.company
    };
    if (month) query.month = month;
    const payslips = await Payslip.find({
      ...query,
      company: req.user.company
    }).populate('employeeId', 'name empId panNumber department').sort({
      createdAt: -1
    });
    const data = payslips.map(slip => ({
      EmployeeName: slip.employeeId?.name || 'Unknown',
      EmpID: slip.employeeId?.empId || '',
      PANNumber: slip.employeeId?.panNumber || '',
      Department: slip.employeeId?.department || '',
      GrossEarnings: slip.basicPay + slip.hra + slip.specialAllowance || 0,
      TDSDeducted: slip.tds || 0,
      Month: slip.month || ''
    }));
    res.status(200).json(data);
  } catch (error) {
    console.error('TDS register error:', error);
    res.status(500).json({
      message: 'Failed to generate TDS register.'
    });
  }
});
module.exports = router;