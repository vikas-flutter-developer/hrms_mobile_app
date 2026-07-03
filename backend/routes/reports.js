const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/auth');

// Models
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const KPI = require('../models/KPI');
const PerformanceReview = require('../models/PerformanceReview');
const Asset = require('../models/Asset');
const Expense = require('../models/Expense');
const TrainingProgram = require('../models/TrainingProgram');
const Candidate = require('../models/Candidate');
const Payslip = require('../models/Payslip');
const Holiday = require('../models/Holiday');
const Admin = require('../models/Admin');
const TrainingAssignment = require('../models/TrainingAssignment');
router.get('/dashboard-overview', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
    const endOfMonthStr = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;

    const [pendingLeaves, attendanceStats, candidateStats, holidays, employees, admin] = await Promise.all([Leave.find({
      company: req.user.company,
      status: 'Pending'
    }).populate('employeeId', 'name profilePhoto'), Attendance.aggregate([{
      $match: {
        date: todayStr
      }
    }, {
      $group: {
        _id: "$status",
        count: {
          $sum: 1
        }
      }
    }]), Candidate.aggregate([{
      $match: {
        company: req.user.company
      }
    }, {
      $group: {
        _id: "$status",
        count: {
          $sum: 1
        }
      }
    }]), Holiday.find({
      company: req.user.company,
      isActive: true,
      date: {
        $gte: todayStr,
        $lte: endOfMonthStr
      }
    }).sort({
      date: 1
    }).limit(3), Employee.find({
      company: req.user.company,
      status: 'Active'
    }, 'name dob joinDate archivedAt status'), Admin.findById(req.user.company) // Assuming single admin or fetch by company
    ]);

    // Process Attendance
    let present = 0,
      absent = 0,
      late = 0;
    attendanceStats.forEach(stat => {
      if (stat._id === 'Present' || stat._id === 'Half-Day') present += stat.count;else if (stat._id === 'Absent') absent += stat.count;else if (stat._id === 'Late') late += stat.count;
    });

    // Process Candidates
    let candTotal = 0,
      candScreening = 0,
      candInterview = 0,
      candOffered = 0;
    candidateStats.forEach(stat => {
      candTotal += stat.count;
      if (stat._id === 'Applied' || stat._id === 'Shortlisted') candScreening += stat.count;
      if (stat._id === 'Interviewing') candInterview += stat.count;
      if (stat._id === 'Offered' || stat._id === 'Hired') candOffered += stat.count;
    });

    // Events (Birthdays/Anniversaries this month)
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const events = [];
    let joinedThisMonth = 0;
    let exitedThisMonth = 0;
    employees.forEach(emp => {
      if (emp.dob) {
        const dobObj = new Date(emp.dob);
        if (dobObj.getMonth() === currentMonth && dobObj.getDate() === currentDay) {
          events.push({
            type: 'Birthday',
            name: emp.name,
            date: dobObj.toLocaleDateString(),
            day: dobObj.getDate()
          });
        }
      }
      if (emp.joinDate) {
        const joinDateObj = new Date(emp.joinDate);
        if (joinDateObj.getMonth() === currentMonth) {
          if (joinDateObj.getFullYear() !== today.getFullYear()) {
            events.push({
              type: 'Anniversary',
              name: emp.name,
              date: joinDateObj.toLocaleDateString(),
              details: `${today.getFullYear() - joinDateObj.getFullYear()} Years`,
              day: joinDateObj.getDate()
            });
          }
          if (joinDateObj.getFullYear() === today.getFullYear()) {
            joinedThisMonth++;
          }
        }
      }
    });

    // Sort events chronologically by the day of the month
    events.sort((a, b) => a.day - b.day);
    events.forEach(ev => delete ev.day);
    const currentMonthStr = new Date().toLocaleString('default', {
      month: 'short',
      year: 'numeric'
    });
    const Payslip = require('../models/Payslip');
    const processedPayslips = await Payslip.countDocuments({
      company: req.user.company,
      month: currentMonthStr,
      status: 'Processed'
    });
    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne({ company: req.user.company });
    const activeEmployees = await Employee.find({ company: req.user.company, status: 'Active' });
    const salaryCost = activeEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    const isFinancialApiConnected = settings?.accountingApi?.isConnected || false;
    const revenue = isFinancialApiConnected ? 5200000 : 0;

    res.status(200).json({
      pendingLeaves,
      attendance: {
        present,
        absent,
        late
      },
      recruitment: {
        total: candTotal,
        screening: candScreening,
        interviewing: candInterview,
        offered: candOffered
      },
      holidays,
      events: events.slice(0, 5),
      trends: {
        joined: joinedThisMonth,
        exited: exitedThisMonth
      },
      payrollStatus: processedPayslips > 0 ? 'Processed' : 'Pending',
      subscriptionExpiry: admin ? admin.subscriptionExpiry : null,
      revenueVsSalary: {
        isFinancialApiConnected,
        revenue,
        salaryCost
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const [totalEmployees, onLeaveToday, pendingExpenses, activeTraining, totalAssets, pendingPerformanceReviews] = await Promise.all([Employee.countDocuments({
      company: req.user.company,
      status: 'Active'
    }), Leave.countDocuments({
      company: req.user.company,
      status: 'Approved',
      startDate: {
        $lte: new Date()
      },
      endDate: {
        $gte: new Date()
      }
    }), Expense.aggregate([{
      $match: {
        company: new mongoose.Types.ObjectId(req.user.company),
        status: 'Pending'
      }
    }, {
      $group: {
        _id: null,
        total: {
          $sum: "$amount"
        }
      }
    }]), TrainingProgram.countDocuments({
      company: req.user.company,
      status: 'Ongoing'
    }), Asset.countDocuments({
      company: req.user.company
    }), PerformanceReview.countDocuments({
      company: req.user.company,
      status: 'Draft'
    })]);
    res.status(200).json({
      headcount: totalEmployees,
      onLeaveToday: onLeaveToday,
      pendingExpenseAmount: pendingExpenses.length > 0 ? pendingExpenses[0].total : 0,
      activeTrainingPrograms: activeTraining,
      totalAssets: totalAssets,
      pendingPerformanceReviews: pendingPerformanceReviews
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.get('/headcount-by-department', verifyToken, async (req, res) => {
  try {
    const stats = await Employee.aggregate([{
      $match: {
        company: new mongoose.Types.ObjectId(req.user.company),
        status: 'Active'
      }
    }, {
      $group: {
        _id: "$department",
        count: {
          $sum: 1
        }
      }
    }]);
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.get('/expenses-by-category', verifyToken, async (req, res) => {
  try {
    const stats = await Expense.aggregate([{
      $match: {
        company: new mongoose.Types.ObjectId(req.user.company),
        status: {
          $ne: 'Rejected'
        }
      }
    }, {
      $group: {
        _id: "$category",
        totalAmount: {
          $sum: "$amount"
        }
      }
    }]);
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CUSTOM REPORT BUILDER ENGINE
router.post('/custom', verifyToken, async (req, res) => {
  try {
    const {
      module,
      filters,
      fields
    } = req.body;
    // module: 'Employee', 'Attendance', 'Expense', etc.
    // filters: { department: 'Engineering', status: 'Active' }
    // fields: 'name empId department joinDate'

    let Model;
    let populateQuery = [];
    switch (module) {
      case 'Employee':
        Model = Employee;
        break;
      case 'Attendance':
        Model = Attendance;
        populateQuery = [{
          path: 'employeeId',
          select: 'name empId department'
        }];
        break;
      case 'Expense':
        Model = Expense;
        populateQuery = [{
          path: 'employeeId',
          select: 'name empId department'
        }];
        break;
      case 'Asset':
        Model = Asset;
        populateQuery = [{
          path: 'assignedTo',
          select: 'name empId'
        }];
        break;
      case 'Leave':
        Model = Leave;
        populateQuery = [{
          path: 'employeeId',
          select: 'name empId'
        }];
        break;
      case 'Candidate':
        Model = Candidate;
        populateQuery = [{
          path: 'jobId',
          select: 'title department'
        }];
        break;
      case 'PerformanceReview':
        Model = PerformanceReview;
        populateQuery = [
          { path: 'employee', select: 'name empId department' },
          { path: 'reviewer', select: 'name empId' }
        ];
        break;
      case 'TrainingAssignment':
        Model = TrainingAssignment;
        populateQuery = [
          { path: 'employee', select: 'name empId department' },
          { path: 'trainingProgram', select: 'title trainer startDate endDate' }
        ];
        break;
      case 'Payslip':
        Model = Payslip;
        populateQuery = [{
          path: 'employeeId',
          select: 'name empId department'
        }];
        break;
      default:
        return res.status(400).json({
          message: 'Invalid module specified'
        });
    }

    // Build Mongoose query dynamically and strictly filter by company
    const queryFilters = { ...(filters || {}) };
    queryFilters.company = req.user.company || null;
    let query = Model.find(queryFilters);
    if (fields) {
      query = query.select(fields);
    }
    if (populateQuery.length > 0) {
      populateQuery.forEach(p => query = query.populate(p));
    }
    const data = await query.exec();
    res.status(200).json(data);
  } catch (err) {
    console.error('Custom Report Error:', err);
    res.status(500).json({
      message: err.message
    });
  }
});

// ─── Attrition / Turnover Report ─────────────────────────────────────────────
router.get('/attrition', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Employees currently on notice period or inactive (treated as exits)
    const allEmployees = await Employee.find({
      company: req.user.company
    }, 'status joinDate archivedAt createdAt department');
    const totalAtStart = await Employee.countDocuments({
      company: req.user.company,
      createdAt: {
        $lte: twelveMonthsAgo
      }
    });
    const currentHeadcount = await Employee.countDocuments({
      company: req.user.company,
      status: 'Active'
    });

    // Build month-by-month data
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = monthStart.toLocaleString('default', {
        month: 'short',
        year: 'numeric'
      });
      const joinings = allEmployees.filter(e => {
        const d = new Date(e.joinDate || e.createdAt);
        return d >= monthStart && d <= monthEnd;
      }).length;
      const exits = allEmployees.filter(e => {
        if (e.status !== 'Notice Period' && e.status !== 'Archived' && e.status !== 'Inactive') return false;
        const d = new Date(e.archivedAt || e.updatedAt);
        return d >= monthStart && d <= monthEnd;
      }).length;
      monthlyData.push({
        month: label,
        exits,
        joinings,
        netChange: joinings - exits
      });
    }
    const totalExits = monthlyData.reduce((s, m) => s + m.exits, 0);
    const attritionRate = totalAtStart > 0 ? parseFloat((totalExits / totalAtStart * 100).toFixed(2)) : 0;
    res.status(200).json({
      attritionRate,
      totalAtStart,
      currentHeadcount,
      totalExits,
      monthly: monthlyData
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ─── Training Completion Report ───────────────────────────────────────────────
router.get('/training-completion', verifyToken, async (req, res) => {
  try {
    const TrainingAssignment = require('../models/TrainingAssignment');
    const assignments = await TrainingAssignment.find({
      company: req.user.company
    }).populate('employee', 'department name');
    let completedCount = 0,
      inProgressCount = 0,
      notStartedCount = 0;
    const deptMap = {};
    for (const a of assignments) {
      const dept = a.employee?.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = {
        total: 0,
        completed: 0
      };
      deptMap[dept].total++;
      if (a.status === 'Completed') {
        completedCount++;
        deptMap[dept].completed++;
      } else if (a.status === 'In Progress' || a.status === 'Assigned') {
        inProgressCount++;
      } else {
        notStartedCount++;
      }
    }
    const deptWise = Object.entries(deptMap).map(([dept, data]) => ({
      dept,
      total: data.total,
      completed: data.completed,
      completionRate: data.total > 0 ? parseFloat((data.completed / data.total * 100).toFixed(1)) : 0
    }));
    res.status(200).json({
      completedCount,
      inProgressCount,
      notStartedCount,
      total: assignments.length,
      deptWise
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ─── Recruitment Report ───────────────────────────────────────────────────────
router.get('/recruitment', verifyToken, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const [totalJobs, candidates] = await Promise.all([Job.countDocuments({
      company: req.user.company
    }), Candidate.find({
      company: req.user.company
    }).populate('jobId', 'title createdBy')]);
    const statusCounts = {};
    const deptHires = {};
    for (const c of candidates) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      if (c.status === 'Hired' && c.jobId?.createdBy) {
        const key = c.jobId.title || 'Unknown';
        deptHires[key] = (deptHires[key] || 0) + 1;
      }
    }
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    const topHiringDepts = Object.entries(deptHires).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([role, count]) => ({
      role,
      count
    }));
    res.status(200).json({
      totalJobs,
      totalApplications: candidates.length,
      hired: statusCounts['Hired'] || 0,
      rejected: statusCounts['Rejected'] || 0,
      statusBreakdown,
      topHiringDepts,
      candidates
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;