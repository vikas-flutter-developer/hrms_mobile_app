const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const AttendanceRegularization = require('../models/AttendanceRegularization');
console.log('[Attendance Router] initialized');
const parseTimeToMinutes = timeStr => {
  if (!timeStr) return 0;
  const upperTime = timeStr.toUpperCase().trim();
  const isPM = upperTime.includes('PM');
  const isAM = upperTime.includes('AM');
  const cleanTime = upperTime.replace(/[AP]M/, '').trim();
  const parts = cleanTime.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;

  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};
const calculateHours = (checkIn, checkOut) => {
  const inMinutes = parseTimeToMinutes(checkIn);
  const outMinutes = parseTimeToMinutes(checkOut);
  return outMinutes > inMinutes ? Number(((outMinutes - inMinutes) / 60).toFixed(2)) : 0;
};
const buildDateRange = (startDate, endDate) => {
  if (startDate && endDate) return {
    startDate,
    endDate
  };
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    startDate: `${month}-01`,
    endDate: `${month}-31`
  };
};
const isHrOrAdmin = role => {
  const normalized = role ? String(role).toLowerCase() : 'employee';
  return normalized === 'admin' || normalized === 'hr';
};
router.get('/hr-profile', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const company = req.user.company;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // "YYYY-MM"

    const totalEmployees = await Employee.countDocuments({ company });
    const totalAttendance = await Attendance.countDocuments({ company });
    const pendingRegularizations = await Attendance.countDocuments({
      company,
      regularizationStatus: 'Pending'
    });
    const recentAbsences = await Attendance.countDocuments({
      company,
      status: 'Absent',
      date: today
    });

    const monthlyAttendance = await Attendance.find({
      company,
      date: { $regex: new RegExp(`^${currentMonth}`) }
    });
    const monthlyOvertime = monthlyAttendance.reduce((sum, rec) => sum + (rec.overtimeHours || 0), 0);

    const auditLogs = await Attendance.find({ company })
      .populate('employeeId', 'name empId role department')
      .sort({ date: -1, createdAt: -1 })
      .limit(50);

    res.status(200).json({
      totalEmployees,
      totalAttendance,
      pendingRegularizations,
      recentAbsences,
      monthlyOvertime,
      auditLogs
    });
  } catch (err) {
    console.error('HR profile error', err);
    res.status(500).json({
      message: 'Unable to build HR attendance profile.'
    });
  }
});

// ==========================================
// 📊 GET: ADMIN/HR MONTHLY STAFF ATTENDANCE & LEAVES SUMMARY
// ==========================================
router.get('/admin/monthly-summary', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Requires Admin or HR role.' });
    }

    const { month, employeeId } = req.query; 
    let targetMonth = month || new Date().toISOString().substring(0, 7);
    
    // Support "July 2026" to "2026-07" conversion
    if (targetMonth.includes(' ')) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const [mName, yStr] = targetMonth.split(' ');
      const mIdx = monthNames.indexOf(mName) + 1;
      if (mIdx > 0) {
        targetMonth = `${yStr}-${mIdx.toString().padStart(2, '0')}`;
      }
    }

    const company = req.user.company;
    const empQuery = { company, status: { $ne: 'Archived' } };
    if (employeeId && employeeId !== 'all') {
      empQuery._id = employeeId;
    }
    const employees = await Employee.find(empQuery, 'name empId department positionLevel role email phone').sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      company,
      date: { $regex: new RegExp(`^${targetMonth}`) }
    });

    const LeaveModel = require('../models/Leave');
    const leaveRecords = await LeaveModel.find({
      company,
      $or: [
        { startDate: { $regex: new RegExp(`^${targetMonth}`) } },
        { endDate: { $regex: new RegExp(`^${targetMonth}`) } }
      ]
    });

    const staffSummaries = employees.map(emp => {
      const empAttendance = attendanceRecords.filter(r => r.employeeId.toString() === emp._id.toString());
      const empLeaves = leaveRecords.filter(l => l.employee && l.employee.toString() === emp._id.toString());

      const presentCount = empAttendance.filter(r => ['Present', 'Late'].includes(r.status)).length;
      const halfDayCount = empAttendance.filter(r => r.status === 'Half-Day').length;
      const absentCount = empAttendance.filter(r => r.status === 'Absent').length;

      const totalLeavesTaken = empLeaves.reduce((sum, l) => sum + (l.daysCount || 1), 0);
      const approvedLeaves = empLeaves.filter(l => l.status === 'Approved').reduce((sum, l) => sum + (l.daysCount || 1), 0);
      const pendingLeaves = empLeaves.filter(l => l.status === 'Pending').length;

      const totalOvertimeHours = empAttendance.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
      const totalHoursWorked = empAttendance.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

      return {
        employee: {
          id: emp._id,
          name: emp.name,
          empId: emp.empId,
          department: emp.department || 'General',
          positionLevel: emp.positionLevel || 'Staff'
        },
        month: targetMonth,
        presentDays: presentCount + (halfDayCount * 0.5),
        absentDays: absentCount,
        halfDays: halfDayCount,
        leavesTaken: approvedLeaves,
        totalLeavesRequested: totalLeavesTaken,
        pendingLeavesCount: pendingLeaves,
        overtimeHours: totalOvertimeHours,
        totalHoursWorked: totalHoursWorked,
        dailyRecords: empAttendance.map(r => ({
          date: r.date,
          status: r.status,
          checkIn: r.checkIn || '--:--',
          checkOut: r.checkOut || '--:--',
          hoursWorked: r.hoursWorked || 0
        }))
      };
    });

    res.status(200).json({
      month: targetMonth,
      totalEmployees: employees.length,
      staffSummaries
    });

  } catch (error) {
    console.error("Admin monthly summary error:", error);
    res.status(500).json({ message: "Failed to build monthly staff summary: " + error.message });
  }
});

// ==========================================
// 👤 GET: CURRENT EMPLOYEE STATUS & LEDGER
// ==========================================
router.get('/status', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await Attendance.findOne({
      company: req.user.company,
      employeeId: req.user.id,
      date: today
    });
    let isCheckedIn = false;
    let todaysLogs = [];
    if (record) {
      if (record.checkIn) {
        isCheckedIn = !record.checkOut;
        todaysLogs.push({
          type: 'Check-In',
          time: record.checkIn,
          source: record.checkInMethod
        });
      }
      if (record.checkOut) {
        todaysLogs.push({
          type: 'Check-Out',
          time: record.checkOut,
          source: record.checkOutMethod
        });
      }
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyRecords = await Attendance.find({
      company: req.user.company,
      employeeId: req.user.id,
      date: {
        $regex: `^${currentMonth}`
      }
    }).sort({
      date: 1
    });
    const monthlyLedger = monthlyRecords.map(r => {
      const dateObj = new Date(r.date);
      return {
        date: r.date,
        day: dateObj.toLocaleDateString('en-US', {
          weekday: 'short'
        }),
        status: r.status,
        hours: r.hoursWorked || 0
      };
    });
    const employee = await Employee.findById(req.user.id).populate('shift');
    res.status(200).json({
      isCheckedIn,
      todaysLogs,
      monthlyLedger,
      empId: employee ? employee.empId : '',
      shiftStartTime: employee?.shift?.startTime || '09:00',
      shiftEndTime: employee?.shift?.endTime || '18:00',
      shiftName: employee?.shift?.name || 'General'
    });
  } catch (err) {
    console.error('Status fetch error', err);
    res.status(500).json({
      message: 'Unable to fetch status.'
    });
  }
});
router.get('/daily-log', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const today = new Date().toISOString().split('T')[0];
    const employees = await Employee.find({
      company: req.user.company
    }).populate('shift').select('name empId role department shift');
    const attendance = await Attendance.find({
      company: req.user.company,
      date: today
    });
    const dailyLog = employees.map(emp => {
      const record = attendance.find(r => r.employeeId.toString() === emp._id.toString());
      return {
        empId: emp.empId,
        name: emp.name,
        role: emp.role || 'Staff',
        department: emp.department || 'General',
        checkIn: record?.checkIn || '--:--',
        checkOut: record?.checkOut || '--:--',
        checkInMethod: record?.checkInMethod || '',
        checkOutMethod: record?.checkOutMethod || '',
        checkInCoordinates: record?.checkInCoordinates || '',
        checkOutCoordinates: record?.checkOutCoordinates || '',
        checkInImage: record?.checkInImage || '',
        status: record?.status || 'Absent',
        hoursWorked: record?.hoursWorked ?? 0,
        hours: record?.hoursWorked ?? 0,
        holidayType: record?.holidayType || 'None',
        shiftName: record?.shiftName || emp.shift?.name || 'General',
        shiftStartTime: emp.shift?.startTime || '09:00',
        shiftEndTime: emp.shift?.endTime || '18:00',
        gracePeriodMinutes: emp.shift?.gracePeriodMinutes || 10
      };
    });
    res.status(200).json(dailyLog);
  } catch (err) {
    console.error('Daily log error', err);
    res.status(500).json({
      message: 'Unable to fetch daily attendance log.'
    });
  }
});

// ==========================================
// 🕒 POST: MANUAL CLOCK-IN GATEWAY
// ==========================================
router.post('/clock-in', verifyToken, async (req, res) => {
  try {
    const {
      source,
      locationCoordinates,
      checkInImage,
      employeeEmpId,
      employeeId
    } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Holiday Check
    const Holiday = require('../models/Holiday');
    const todayHoliday = await Holiday.findOne({
      company: req.user.company,
      date: today,
      isActive: true
    });
    if (todayHoliday) {
      return res.status(403).json({ message: `Today is a holiday (${todayHoliday.name}). You cannot mark attendance.` });
    }

    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    let targetEmployeeId = req.user.id;
    if (employeeEmpId) {
      const targetEmp = await Employee.findOne({ company: req.user.company, empId: employeeEmpId });
      if (!targetEmp) return res.status(404).json({ message: "Employee not found." });
      if (req.user.role !== 'admin' && req.user.role !== 'hr' && targetEmp._id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied." });
      }
      targetEmployeeId = targetEmp._id;
    } else if (employeeId && (req.user.role === 'admin' || req.user.role === 'hr')) {
      targetEmployeeId = employeeId;
    }

    const existingRecord = await Attendance.findOne({
      company: req.user.company,
      employeeId: targetEmployeeId,
      date: today
    });
    if (existingRecord && existingRecord.checkIn) return res.status(400).json({
      message: "Already checked in today."
    });

    // Shift check
    const emp = await Employee.findById(targetEmployeeId).populate('shift');
    let shiftId = emp?.shift?._id || null;
    let shiftName = emp?.shift?.name || 'General';
    let status = 'Present';

    if (emp && emp.shift) {
      const checkInMinutes = parseTimeToMinutes(currentTime);
      const shiftStartMinutes = parseTimeToMinutes(emp.shift.startTime);
      const grace = emp.shift.gracePeriodMinutes || 0;
      if (checkInMinutes > shiftStartMinutes + grace) {
        status = 'Late';
      }
    }

    let attendance = existingRecord;
    if (!attendance) {
      attendance = new Attendance({
        company: req.user.company,
        employeeId: targetEmployeeId,
        date: today,
        checkIn: currentTime,
        checkInMethod: source || 'Web Check-In',
        checkInCoordinates: locationCoordinates || '',
        locationCoordinates: locationCoordinates || '',
        checkInImage: checkInImage || '',
        shiftId,
        shiftName,
        status
      });
      await attendance.save();
    } else {
      attendance.checkIn = currentTime;
      attendance.checkInMethod = source || 'Web Check-In';
      attendance.checkInCoordinates = locationCoordinates || '';
      if (locationCoordinates) attendance.locationCoordinates = locationCoordinates;
      attendance.checkInImage = checkInImage || '';
      attendance.shiftId = shiftId;
      attendance.shiftName = shiftName;
      attendance.status = status;
      await attendance.save();
    }
    const monthlyRecords = await Attendance.find({
      company: req.user.company,
      employeeId: req.user.id,
      date: {
        $regex: `^${today.slice(0, 7)}`
      }
    }).sort({
      date: 1
    });
    const monthlyLedger = monthlyRecords.map(r => ({
      date: r.date,
      day: new Date(r.date).toLocaleDateString('en-US', {
        weekday: 'short'
      }),
      status: r.status,
      hours: r.hoursWorked || 0
    }));
    const todaysLogs = [{
      type: 'Check-In',
      time: currentTime,
      source: attendance.checkInMethod
    }];
    res.status(201).json({
      message: "Clock-in successful.",
      updatedLogs: todaysLogs,
      updatedLedger: monthlyLedger
    });
  } catch (err) {
    console.error("Clock-in error:", err);
    res.status(500).json({
      message: "Error processing clock-in."
    });
  }
});

// ==========================================
// 🕒 POST: APPLY FOR REGULARIZATION
// ==========================================
router.post('/regularize', verifyToken, async (req, res) => {
  try {
    const { date, attendanceId, requestedStatus, reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required.' });
    }

    let employeeId = req.user.id;
    let finalDate = date;

    let attendance;
    if (attendanceId) {
      attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance record not found.' });
      }
      finalDate = attendance.date;
      employeeId = attendance.employeeId;
    } else if (date) {
      attendance = await Attendance.findOne({
        company: req.user.company,
        employeeId: req.user.id,
        date: date
      });
      if (!attendance) {
        attendance = new Attendance({
          company: req.user.company,
          employeeId: req.user.id,
          date: date,
          status: 'Absent',
          checkIn: '',
          checkOut: '',
          hoursWorked: 0
        });
      }
    } else {
      return res.status(400).json({ message: 'Either date or attendanceId is required.' });
    }

    // Update Attendance
    attendance.isRegularized = true;
    attendance.regularizationReason = reason;
    attendance.regularizationStatus = 'Pending';
    await attendance.save();

    // Create / Update AttendanceRegularization
    const AttendanceRegularization = require('../models/AttendanceRegularization');
    
    // Check if there is already a pending request for this date/employee to avoid duplicates
    let reg = await AttendanceRegularization.findOne({
      company: req.user.company,
      employee: employeeId,
      date: new Date(finalDate)
    });
    
    if (reg) {
      reg.requestedStatus = requestedStatus || 'Present';
      reg.reason = reason;
      reg.status = 'Pending';
    } else {
      reg = new AttendanceRegularization({
        company: req.user.company,
        employee: employeeId,
        date: new Date(finalDate),
        requestedStatus: requestedStatus || 'Present',
        reason: reason,
        status: 'Pending'
      });
    }
    await reg.save();

    res.status(200).json({
      message: 'Regularization request submitted successfully.',
      attendance,
      reg
    });
  } catch (err) {
    console.error("Regularization error:", err);
    res.status(500).json({ message: 'Failed to submit regularization request.' });
  }
});

router.post('/clock-out', verifyToken, async (req, res) => {
  try {
    const {
      source,
      locationCoordinates,
      employeeEmpId,
      employeeId
    } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    let targetEmployeeId = req.user.id;
    if (employeeEmpId) {
      const targetEmp = await Employee.findOne({ company: req.user.company, empId: employeeEmpId });
      if (!targetEmp) return res.status(404).json({ message: "Employee not found." });
      if (req.user.role !== 'admin' && req.user.role !== 'hr' && targetEmp._id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied." });
      }
      targetEmployeeId = targetEmp._id;
    } else if (employeeId && (req.user.role === 'admin' || req.user.role === 'hr')) {
      targetEmployeeId = employeeId;
    }

    const attendance = await Attendance.findOne({
      company: req.user.company,
      employeeId: targetEmployeeId,
      date: today
    });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        message: 'No check-in record found for today.'
      });
    }
    attendance.checkOut = currentTime;
    attendance.checkOutMethod = source || 'Web Check-Out';
    attendance.checkOutCoordinates = locationCoordinates || '';
    if (locationCoordinates) {
      attendance.locationCoordinates = attendance.locationCoordinates ? `${attendance.locationCoordinates} | Out: ${locationCoordinates}` : locationCoordinates;
    }
    attendance.hoursWorked = calculateHours(attendance.checkIn, attendance.checkOut);
    
    // Calculate Overtime based on Shift
    let calculatedOvertimeHours = 0;
    let shiftEndMins = 18 * 60; // Default 6 PM
    let shiftToUse = null;
    if (attendance.shiftId) {
      const Shift = require('../models/Shift');
      shiftToUse = await Shift.findById(attendance.shiftId);
    } else {
      const employeeObj = await Employee.findById(targetEmployeeId).populate('shift');
      shiftToUse = employeeObj?.shift;
    }
    if (shiftToUse && shiftToUse.endTime) {
      shiftEndMins = parseTimeToMinutes(shiftToUse.endTime);
    }
    
    const checkOutMinsLocal = parseTimeToMinutes(currentTime);
    
    if (checkOutMinsLocal > shiftEndMins) {
      calculatedOvertimeHours = (checkOutMinsLocal - shiftEndMins) / 60;
    }
    attendance.overtimeHours = parseFloat(calculatedOvertimeHours.toFixed(2));

    // Dynamic status computation
    let newStatus = 'Present';
    if (attendance.hoursWorked < 8) {
      newStatus = 'Early Leave';
    } else {
      let wasLate = false;
      if (shiftToUse) {
        const checkInMins = parseTimeToMinutes(attendance.checkIn);
        const shiftStartMins = parseTimeToMinutes(shiftToUse.startTime);
        const grace = shiftToUse.gracePeriodMinutes || 0;
        if (checkInMins > shiftStartMins + grace) {
          wasLate = true;
        }
      }
      if (attendance.overtimeHours > 0) {
        newStatus = 'Overtime';
      } else {
        newStatus = wasLate ? 'Late' : 'Present';
      }
    }
    attendance.status = newStatus;

    await attendance.save();
    const monthlyRecords = await Attendance.find({
      company: req.user.company,
      employeeId: req.user.id,
      date: {
        $regex: `^${today.slice(0, 7)}`
      }
    }).sort({
      date: 1
    });
    const monthlyLedger = monthlyRecords.map(r => ({
      date: r.date,
      day: new Date(r.date).toLocaleDateString('en-US', {
        weekday: 'short'
      }),
      status: r.status,
      hours: r.hoursWorked || 0
    }));
    const todaysLogs = [{
      type: 'Check-In',
      time: attendance.checkIn,
      source: attendance.checkInMethod
    }, {
      type: 'Check-Out',
      time: currentTime,
      source: attendance.checkOutMethod
    }];
    res.status(200).json({
      message: 'Clock-out successful.',
      updatedLogs: todaysLogs,
      updatedLedger: monthlyLedger
    });
  } catch (err) {
    console.error('Clock-out error', err);
    res.status(500).json({
      message: 'Unable to process clock-out.'
    });
  }
});
router.get('/report', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      startDate,
      endDate,
      employeeId
    } = req.query;
    const range = buildDateRange(startDate, endDate);
    const query = {
      date: {
        $gte: range.startDate,
        $lte: range.endDate
      }
    };
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = employeeId;
    }
    const records = await Attendance.find({
      ...query,
      company: req.user.company
    }).populate({
      path: 'employeeId',
      select: 'name empId department role shift',
      populate: {
        path: 'shift',
        select: 'name startTime endTime gracePeriodMinutes'
      }
    });
    const result = records.map(rec => ({
      id: rec._id,
      empId: rec.employeeId?.empId || null,
      name: rec.employeeId?.name || 'Unknown',
      department: rec.employeeId?.department || 'General',
      role: rec.employeeId?.role || 'Staff',
      date: rec.date,
      checkIn: rec.checkIn,
      checkOut: rec.checkOut,
      checkInMethod: rec.checkInMethod,
      checkOutMethod: rec.checkOutMethod,
      checkInCoordinates: rec.checkInCoordinates || '',
      checkOutCoordinates: rec.checkOutCoordinates || '',
      checkInImage: rec.checkInImage || '',
      hoursWorked: rec.hoursWorked,
      status: rec.status,
      shiftName: rec.shiftName || rec.employeeId?.shift?.name || 'General',
      shiftStartTime: rec.employeeId?.shift?.startTime || '09:00',
      shiftEndTime: rec.employeeId?.shift?.endTime || '18:00',
      gracePeriodMinutes: rec.employeeId?.shift?.gracePeriodMinutes || 10,
      overtimeHours: rec.overtimeHours,
      regularizationStatus: rec.regularizationStatus,
      holidayType: rec.holidayType
    }));
    res.status(200).json(result);
  } catch (err) {
    console.error('Attendance report error', err);
    res.status(500).json({
      message: 'Unable to generate attendance report.'
    });
  }
});
router.get('/reports/advanced', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      startDate,
      endDate,
      type
    } = req.query; // type: 'late', 'early', 'overtime'
    const range = buildDateRange(startDate, endDate);

    // Fetch all relevant attendance records in date range
    const records = await Attendance.find({
      company: req.user.company,
      date: {
        $gte: range.startDate,
        $lte: range.endDate
      }
    }).populate({
      path: 'employeeId',
      select: 'name empId department role shift',
      populate: {
        path: 'shift'
      }
    }).populate('shiftId'); // Populate shift rules

    let results = [];
    for (const rec of records) {
      if (!rec.employeeId || rec.status === 'Absent' || !rec.checkIn) continue;
      const shift = rec.shiftId || rec.employeeId?.shift || {
        startTime: '09:00',
        endTime: '18:00',
        totalHours: 8,
        gracePeriodMinutes: 10
      };
      const checkInMins = parseTimeToMinutes(rec.checkIn);
      const shiftStartMins = parseTimeToMinutes(shift.startTime);
      const isLate = checkInMins > shiftStartMins + (shift.gracePeriodMinutes || 0);
      
      let checkOutMins = 0;
      let shiftEndMins = 0;
      let isEarlyLeave = false;
      let calculatedOvertimeHours = 0;
      let isOvertime = false;
      let earlyMins = 0;

      if (rec.checkOut) {
        checkOutMins = parseTimeToMinutes(rec.checkOut);
        shiftEndMins = parseTimeToMinutes(shift.endTime);
        isEarlyLeave = checkOutMins < shiftEndMins;
        if (checkOutMins > shiftEndMins) {
          calculatedOvertimeHours = (checkOutMins - shiftEndMins) / 60;
        }
        isOvertime = calculatedOvertimeHours > 0;
        earlyMins = isEarlyLeave ? (shiftEndMins - checkOutMins) : 0;
      }

      const formattedRecord = {
        id: rec._id,
        empId: rec.employeeId.empId,
        name: rec.employeeId.name,
        department: rec.employeeId.department,
        date: rec.date,
        checkIn: rec.checkIn,
        checkOut: rec.checkOut || '',
        shiftStartTime: shift.startTime,
        shiftEndTime: shift.endTime,
        hoursWorked: rec.hoursWorked || 0,
        overtimeHours: parseFloat(calculatedOvertimeHours.toFixed(2))
      };

      if (type === 'late' && isLate) {
        const lateMins = checkInMins - shiftStartMins;
        results.push({
          ...formattedRecord,
          lateMinutes: lateMins
        });
      } else if (type === 'early' && rec.checkOut && isEarlyLeave) {
        results.push({
          ...formattedRecord,
          earlyMinutes: earlyMins
        });
      } else if (type === 'overtime' && rec.checkOut && isOvertime) {
        results.push(formattedRecord);
      }
    }
    res.status(200).json(results);
  } catch (err) {
    console.error('Advanced reports error:', err);
    res.status(500).json({
      message: 'Unable to generate advanced report.'
    });
  }
});
router.get('/history/:employeeId', verifyToken, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        message: 'Invalid employee id'
      });
    }
    if (!isHrOrAdmin(req.user.role) && req.user.id !== employeeId) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const records = await Attendance.find({
      company: req.user.company,
      employeeId
    }).sort({
      date: -1
    });
    res.status(200).json(records);
  } catch (err) {
    console.error('History error', err);
    res.status(500).json({
      message: 'Unable to fetch attendance history.'
    });
  }
});
router.post('/manual-entry', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      employeeId,
      date,
      checkIn,
      checkOut,
      status,
      shiftId,
      overtimeHours,
      holidayType
    } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({
        message: 'employeeId and date are required'
      });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }
    const updateData = {
      employeeId,
      date,
      checkIn,
      checkOut,
      status: status || 'Present',
      hoursWorked: calculateHours(checkIn, checkOut),
      overtimeHours: overtimeHours || 0,
      holidayType: holidayType || 'None'
    };
    if (shiftId) {
      updateData.shiftId = shiftId;
    } else {
      updateData.shiftId = null;
      updateData.shiftName = 'General';
    }
    const attendance = await Attendance.findOneAndUpdate({
      employeeId,
      date
    }, updateData, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });
    res.status(200).json(attendance);
  } catch (err) {
    console.error('Manual entry error', err);
    res.status(500).json({
      message: 'Unable to save manual attendance entry.'
    });
  }
});

router.get('/shifts', verifyToken, async (req, res) => {
  console.log('[Attendance Route] GET /shifts hit');
  try {
    const shifts = await Shift.find({
      company: req.user.company
    }).sort({
      createdAt: -1
    });
    res.status(200).json(shifts);
  } catch (err) {
    console.error('Shifts error', err);
    res.status(500).json({
      message: 'Unable to fetch shifts.'
    });
  }
});
router.post('/shifts', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      name,
      startTime,
      endTime,
      totalHours,
      rotationCycle,
      gracePeriodMinutes,
      nightShiftAllowancePercent
    } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        message: 'name, startTime, and endTime are required'
      });
    }
    const shift = new Shift({
      company: req.user.company,
      name,
      startTime,
      endTime,
      totalHours: totalHours || 8,
      rotationCycle: rotationCycle || 'Weekly',
      gracePeriodMinutes: gracePeriodMinutes ?? 10,
      nightShiftAllowancePercent: nightShiftAllowancePercent || 0
    });
    await shift.save();
    res.status(201).json(shift);
  } catch (err) {
    console.error('Create shift error', err);
    res.status(500).json({
      message: 'Unable to create shift.'
    });
  }
});
router.patch('/shifts/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!shift) return res.status(404).json({
      message: 'Shift not found'
    });
    res.status(200).json(shift);
  } catch (err) {
    console.error('Update shift error', err);
    res.status(500).json({
      message: 'Unable to update shift.'
    });
  }
});
router.get('/holidays', verifyToken, async (req, res) => {
  console.log('[Attendance Route] GET /holidays hit');
  try {
    const localHolidays = await Holiday.find({
      company: req.user.company,
      isActive: true
    });

    const MasterData = require('../models/MasterData');
    const masterDataHolidaysRaw = await MasterData.find({
      category: 'Holiday',
      $or: [{ companyId: null }, { companyId: req.user.company }]
    });

    const sortedMD = [...masterDataHolidaysRaw].sort((a, b) => {
      if (a.companyId === null && b.companyId !== null) return -1;
      if (a.companyId !== null && b.companyId === null) return 1;
      return 0;
    });

    const mergedMDMap = new Map();
    for (const item of sortedMD) {
      mergedMDMap.set(item.name.toLowerCase(), item);
    }
    
    const activeMDHolidays = Array.from(mergedMDMap.values()).filter(item => item.isActive);

    const mappedMDHolidays = activeMDHolidays.map(item => ({
      _id: item._id,
      name: item.name,
      date: item.holidayDate ? item.holidayDate.toISOString().split('T')[0] : '',
      type: 'National',
      state: item.code || 'All',
      description: item.description || '',
      isActive: item.isActive,
      isMasterData: true
    }));

    const allHolidays = [...localHolidays.map(h => h.toObject()), ...mappedMDHolidays];
    allHolidays.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    res.status(200).json(allHolidays);
  } catch (err) {
    console.error('Holidays error', err);
    res.status(500).json({
      message: 'Unable to fetch holidays.'
    });
  }
});
router.post('/holidays/generate-indian', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) return res.status(403).json({
      message: 'Access denied'
    });
    const indianHolidays2026 = [{
      name: 'Republic Day',
      date: '2026-01-26',
      type: 'National',
      state: 'All'
    }, {
      name: 'Holi',
      date: '2026-03-03',
      type: 'Optional',
      state: 'All'
    }, {
      name: 'Good Friday',
      date: '2026-04-03',
      type: 'Optional',
      state: 'All'
    }, {
      name: 'Independence Day',
      date: '2026-08-15',
      type: 'National',
      state: 'All'
    }, {
      name: 'Gandhi Jayanti',
      date: '2026-10-02',
      type: 'National',
      state: 'All'
    }, {
      name: 'Dussehra',
      date: '2026-10-20',
      type: 'Optional',
      state: 'All'
    }, {
      name: 'Diwali',
      date: '2026-11-08',
      type: 'National',
      state: 'All'
    }, {
      name: 'Christmas',
      date: '2026-12-25',
      type: 'National',
      state: 'All'
    }];
    const holidaysToInsert = indianHolidays2026.map(h => ({
      company: req.user.company,
      ...h
    }));
    await Holiday.insertMany(holidaysToInsert);
    res.status(201).json({
      message: 'Indian holidays generated successfully.'
    });
  } catch (err) {
    console.error('Generate holidays error', err);
    res.status(500).json({
      message: 'Unable to generate holidays.'
    });
  }
});
router.post('/device-sync', async (req, res) => {
  try {
    const {
      empId,
      timestamp,
      apiKey
    } = req.body;

    // 1. Verify API Key
    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne();
    if (!settings || !settings.attendanceSettings || !settings.attendanceSettings.allowHardwareCheckIn) {
      return res.status(403).json({
        message: 'Hardware Check-in is disabled.'
      });
    }
    if (settings.attendanceSettings.hardwareIntegration.apiKey !== apiKey) {
      return res.status(401).json({
        message: 'Invalid API Key'
      });
    }

    // 2. Find Employee
    const Employee = require('../models/Employee');
    const emp = await Employee.findOne({
      empId
    });
    if (!emp) return res.status(404).json({
      message: 'Employee not found'
    });

    // 3. Mark Attendance (Simplified logic: if first scan today -> CheckIn, else -> CheckOut)
    const dateObj = timestamp ? new Date(timestamp) : new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
    let log = await Attendance.findOne({
      employeeId: emp._id,
      date: dateStr
    });
    if (!log) {
      log = new Attendance({
        company: emp.company,
        employeeId: emp._id,
        date: dateStr,
        checkIn: timeStr,
        checkInMethod: 'Biometric',
        status: 'Present'
      });
    } else {
      // Already checked in (and maybe out)
      log.checkOut = timeStr; // Overwrite checkout
      log.checkOutMethod = 'Biometric';
      log.hoursWorked = calculateHours(log.checkIn, log.checkOut);
      
      // Calculate Overtime
      let calculatedOvertimeHours = 0;
      let shiftEndMins = 18 * 60; // Default 6 PM
      if (log.shiftId) {
        const Shift = require('../models/Shift');
        const shiftData = await Shift.findById(log.shiftId);
        if (shiftData && shiftData.endTime) {
          const parts = shiftData.endTime.split(':');
          shiftEndMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
      
      const checkOutParts = timeStr.split(':');
      const checkOutMinsLocal = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
      
      if (checkOutMinsLocal > shiftEndMins) {
        calculatedOvertimeHours = (checkOutMinsLocal - shiftEndMins) / 60;
      }
      log.overtimeHours = parseFloat(calculatedOvertimeHours.toFixed(2));

      log.status = log.hoursWorked >= 8 ? 'Present' : 'Early Leave';
    }
    await log.save();
    res.status(200).json({
      message: 'Sync successful',
      log
    });
  } catch (err) {
    console.error('Device Sync Error:', err);
    res.status(500).json({
      message: 'Sync failed'
    });
  }
});
router.post('/device-sync/test', verifyToken, async (req, res) => {
  try {
    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne();
    if (!settings || !settings.attendanceSettings || !settings.attendanceSettings.allowHardwareCheckIn || !settings.attendanceSettings.hardwareIntegration?.apiKey) {
      return res.status(400).json({
        success: false,
        message: "Biometric Device: Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }
    res.status(200).json({
      success: true,
      message: "Connection to biometric device is verified successfully."
    });
  } catch (err) {
    res.status(500).json({
      message: "Error checking biometric connection status."
    });
  }
});
router.post('/mobile-check-in', verifyToken, async (req, res) => {
  try {
    const {
      locationCoordinates,
      deviceKey
    } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Holiday Check
    const Holiday = require('../models/Holiday');
    const todayHoliday = await Holiday.findOne({
      company: req.user.company,
      date: today,
      isActive: true
    });
    if (todayHoliday) {
      return res.status(403).json({ message: `Today is a holiday (${todayHoliday.name}). You cannot mark attendance.` });
    }

    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne();
    if (!settings || !settings.attendanceSettings?.allowWebCheckIn) {
      return res.status(400).json({
        message: "Mobile App Check-in: Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }
    if (!deviceKey) {
      return res.status(400).json({
        message: "Mobile App Check-in: Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }
    const existingRecord = await Attendance.findOne({
      company: req.user.company,
      employeeId: req.user.id,
      date: today
    });
    let isCheckOut = false;
    let attendance = existingRecord;
    if (!attendance) {
      attendance = new Attendance({
        company: req.user.company,
        employeeId: req.user.id,
        date: today,
        checkIn: currentTime,
        checkInMethod: 'Mobile App',
        locationCoordinates: locationCoordinates || '',
        status: 'Present'
      });
      await attendance.save();
    } else if (!attendance.checkIn) {
      attendance.checkIn = currentTime;
      attendance.checkInMethod = 'Mobile App';
      if (locationCoordinates) attendance.locationCoordinates = locationCoordinates;
      attendance.status = 'Present';
      await attendance.save();
    } else {
      attendance.checkOut = currentTime;
      attendance.checkOutMethod = 'Mobile App';
      if (locationCoordinates) {
        attendance.locationCoordinates = attendance.locationCoordinates ? `${attendance.locationCoordinates} | Out: ${locationCoordinates}` : locationCoordinates;
      }
      attendance.hoursWorked = calculateHours(attendance.checkIn, attendance.checkOut);
      attendance.status = attendance.hoursWorked >= 8 ? 'Present' : 'Early Leave';
      await attendance.save();
      isCheckOut = true;
    }
    res.status(200).json({
      success: true,
      message: isCheckOut ? "Mobile clock-out successful." : "Mobile clock-in successful.",
      attendance
    });
  } catch (err) {
    console.error("Mobile Check-in Error:", err);
    res.status(500).json({
      message: "Error processing mobile check-in."
    });
  }
});
router.post('/holidays', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      name,
      date,
      type,
      state,
      description
    } = req.body;
    if (!name || !date) {
      return res.status(400).json({
        message: 'name and date are required'
      });
    }
    const holiday = new Holiday({
      company: req.user.company,
      name,
      date,
      type: type || 'National',
      state: state || 'All',
      description: description || ''
    });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (err) {
    console.error('Create holiday error', err);
    res.status(500).json({
      message: 'Unable to create holiday.'
    });
  }
});
router.patch('/holidays/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    let holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!holiday) {
      const MasterData = require('../models/MasterData');
      const md = await MasterData.findById(req.params.id);
      if (md) {
        if (req.body.name) md.name = req.body.name;
        if (req.body.description !== undefined) md.description = req.body.description;
        if (req.body.date) md.holidayDate = new Date(req.body.date);
        await md.save();
        return res.status(200).json({
          _id: md._id,
          name: md.name,
          date: md.holidayDate ? md.holidayDate.toISOString().split('T')[0] : '',
          type: 'National',
          description: md.description || ''
        });
      }
      return res.status(404).json({
        message: 'Holiday not found'
      });
    }
    res.status(200).json(holiday);
  } catch (err) {
    console.error('Update holiday error', err);
    res.status(500).json({
      message: 'Unable to update holiday.'
    });
  }
});

router.delete('/holidays/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    let holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      const MasterData = require('../models/MasterData');
      holiday = await MasterData.findByIdAndDelete(req.params.id);
    }
    if (!holiday) {
      return res.status(404).json({
        message: 'Holiday not found'
      });
    }
    res.status(200).json({
      message: 'Holiday deleted successfully'
    });
  } catch (err) {
    console.error('Delete holiday error', err);
    res.status(500).json({
      message: 'Unable to delete holiday.'
    });
  }
});

// ==========================================
// 📋 ATTENDANCE REGULARIZATION ROUTES
// ==========================================

// POST: Employee submits a regularization request
router.post('/regularization', verifyToken, async (req, res) => {
  try {
    const {
      date,
      requestedStatus,
      reason
    } = req.body;
    if (!date || !requestedStatus || !reason) {
      return res.status(400).json({
        message: 'date, requestedStatus, and reason are required.'
      });
    }

    let attendance = await Attendance.findOne({
      company: req.user.company,
      employeeId: req.user.id,
      date: date
    });
    if (!attendance) {
      attendance = new Attendance({
        company: req.user.company,
        employeeId: req.user.id,
        date: date,
        status: 'Absent',
        checkIn: '',
        checkOut: '',
        hoursWorked: 0
      });
    }

    attendance.isRegularized = true;
    attendance.regularizationReason = reason;
    attendance.regularizationStatus = 'Pending';
    await attendance.save();

    let reg = await AttendanceRegularization.findOne({
      company: req.user.company,
      employee: req.user.id,
      date: new Date(date)
    });
    
    if (reg) {
      reg.requestedStatus = requestedStatus;
      reg.reason = reason;
      reg.status = 'Pending';
    } else {
      reg = new AttendanceRegularization({
        company: req.user.company,
        employee: req.user.id,
        date: new Date(date),
        requestedStatus,
        reason,
        status: 'Pending'
      });
    }
    await reg.save();

    res.status(201).json({
      message: 'Regularization request submitted.',
      reg,
      attendance
    });
  } catch (err) {
    console.error('Regularization submit error', err);
    res.status(500).json({
      message: 'Unable to submit regularization request.'
    });
  }
});

// GET: Admin fetches all pending regularization requests
router.get('/regularization', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const filterQuery = { company: req.user.company };
    if (req.user.role === 'hr') {
      filterQuery.employee = { $ne: req.user.id };
    }
    const regs = await AttendanceRegularization.find(filterQuery).populate('employee', 'name empId department').sort({
      createdAt: -1
    });
    res.status(200).json(regs);
  } catch (err) {
    console.error('Regularization fetch error', err);
    res.status(500).json({
      message: 'Unable to fetch regularization requests.'
    });
  }
});

// PUT: Admin approves or rejects a regularization request
router.put('/regularization/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      status,
      reviewNote
    } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        message: 'status must be Approved or Rejected.'
      });
    }
    const reg = await AttendanceRegularization.findById(req.params.id);
    if (!reg) return res.status(404).json({
      message: 'Regularization request not found.'
    });
    reg.status = status;
    reg.reviewNote = reviewNote || '';
    reg.reviewedBy = req.user.id;

    // Record actioner name and ID
    let actionedByName = '';
    let actionedByIdString = '';
    if (req.user.role === 'admin') {
      const Admin = require('../models/Admin');
      const adminUser = await Admin.findById(req.user.id);
      actionedByName = adminUser ? adminUser.name || 'Admin' : 'Admin';
      actionedByIdString = adminUser ? adminUser.email || req.user.id : req.user.id;
    } else {
      const employeeUser = await Employee.findById(req.user.id);
      actionedByName = employeeUser ? employeeUser.name : 'Staff';
      actionedByIdString = employeeUser ? employeeUser.empId || req.user.id : req.user.id;
    }
    reg.actionedByName = actionedByName;
    reg.actionedByIdString = actionedByIdString;

    // Update the Attendance record
    const dateStr = new Date(reg.date).toISOString().split('T')[0];
    await Attendance.findOneAndUpdate({
      employeeId: reg.employee,
      date: dateStr
    }, {
      status: status === 'Approved' ? reg.requestedStatus : 'Absent',
      regularizationStatus: status,
      isRegularized: status === 'Approved' ? true : false
    }, {
      upsert: true,
      new: true
    });

    await reg.save();
    res.status(200).json({
      message: `Regularization ${status}.`,
      reg
    });
  } catch (err) {
    console.error('Regularization update error', err);
    res.status(500).json({
      message: 'Unable to update regularization request.'
    });
  }
});
// GET: Employee fetches their own regularization requests
router.get('/my-regularizations', verifyToken, async (req, res) => {
  try {
    const regs = await AttendanceRegularization.find({
      company: req.user.company,
      employee: req.user.id
    }).sort({ date: -1 });
    res.status(200).json(regs);
  } catch (err) {
    console.error('My regularizations fetch error', err);
    res.status(500).json({
      message: 'Unable to fetch regularization requests.'
    });
  }
});

module.exports = router;