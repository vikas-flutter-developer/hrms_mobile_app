const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const verifyToken = require('../middleware/auth');

// ==========================================
// 🎛️ 1. PATCH: ADMIN TOGGLE SWITCH FOR HR PRIVILEGES
// ==========================================
router.patch('/toggle-hr-power', verifyToken, async (req, res) => {
  const {
    enablePower
  } = req.body;
  const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
  if (requestorRole !== 'admin') {
    return res.status(403).json({
      message: "Access Denied: Only root workspace administrators can modify core permissions."
    });
  }
  try {
    const updatedAdmin = await Admin.findOneAndUpdate({}, {
      $set: {
        isHrLeavePowerEnabled: enablePower
      }
    }, {
      new: true,
      upsert: true
    });
    res.status(200).json({
      message: `HR Leave Management power turned ${enablePower ? 'ON' : 'OFF'} successfully.`,
      isHrLeavePowerEnabled: updatedAdmin.isHrLeavePowerEnabled
    });
  } catch (err) {
    console.error("Error patching global configuration switches:", err);
    res.status(500).json({
      message: "Error changing system configurations control gates."
    });
  }
});
router.get('/hr-power-status', verifyToken, async (req, res) => {
  try {
    const adminConfig = await Admin.findOne();
    res.status(200).json({
      isHrLeavePowerEnabled: adminConfig ? adminConfig.isHrLeavePowerEnabled : true
    });
  } catch (err) {
    res.status(500).json({
      message: "Error reading system configurations control gates."
    });
  }
});

// ==========================================
// 📋 2. GET: COMPACT INTERFACE FOR HR DASHBOARD VIEW
// ==========================================
router.get('/pending', verifyToken, async (req, res) => {
  const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';

  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  try {
    let isHrLeavePowerEnabled = true;
    if (requestorRole === 'hr' || requestorRole === 'employee') {
      const hrUser = await Employee.findById(req.user.id);
      if (hrUser && hrUser.createdBy) {
        const adminWorkspace = await Admin.findById(hrUser.createdBy);
        if (adminWorkspace) isHrLeavePowerEnabled = adminWorkspace.isHrLeavePowerEnabled;
      } else {
        const globalConfig = await Admin.findOne();
        if (globalConfig) isHrLeavePowerEnabled = globalConfig.isHrLeavePowerEnabled;
      }
    }
    const query = {
      status: 'Pending'
    };
    if (requestorRole === 'hr') query.employeeRole = {
      $ne: 'hr'
    };
    const [leavesData, total] = await Promise.all([Leave.find({
      ...query,
      company: req.user.company
    }).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    }).skip(skip).limit(limit).lean(), Leave.countDocuments(query)]);
    const cleanLeaves = leavesData.map(leave => ({
      id: leave._id,
      name: leave.employeeId?.name || "Unknown Worker",
      type: leave.type,
      timeline: `${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`,
      days: leave.days,
      reason: leave.reason || "No statements provided.",
      employeeRole: leave.employeeRole
    }));
    res.status(200).json({
      isHrLeavePowerEnabled,
      leaves: cleanLeaves,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    console.error("Error compounding aggregate parameters:", err);
    res.status(500).json({
      message: "Error compiling leave tracking state structures."
    });
  }
});

// ==========================================
// 📋 3. GET: FETCH ALL LEAVES (ADMIN BULK LISTINGS VIEW)
// ==========================================
router.get('/all', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    if (userRole !== 'admin' && userRole !== 'hr') {
      return res.status(403).json({
        message: "Access Denied: Only administrators and HR can view all leave requests."
      });
    }

    const allLeaves = await Leave.find({
      company: req.user.company
    }).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    });

    res.status(200).json(allLeaves);
  } catch (err) {
    console.error("Error fetching all leaves:", err);
    res.status(500).json({
      message: "Error fetching all leave requests."
    });
  }
});

// ==========================================
// 📋 3b. GET: FETCH PENDING REVIEW LEAVES
// ==========================================
router.get('/pending-reviews', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role.toLowerCase();
    if (userRole === 'admin') {
      const allPending = await Leave.find({
        company: req.user.company,
        status: 'Pending'
      }).populate('employeeId', 'name empId department');
      return res.status(200).json(allPending);
    }
    if (userRole === 'hr') {
      const adminConfig = await Admin.findOne();
      if (adminConfig && !adminConfig.isHrLeavePowerEnabled) {
        return res.status(403).json({
          message: "Your leave review privileges are currently disabled by the Admin."
        });
      }
      const employeePending = await Leave.find({
        company: req.user.company,
        status: 'Pending',
        employeeRole: 'employee'
      }).populate('employeeId', 'name empId department');
      return res.status(200).json(employeePending);
    }
    return res.status(403).json({
      message: "Unauthorized access path target."
    });
  } catch (err) {
    console.error("Error inside pending-reviews route handler:", err);
    res.status(500).json({
      message: "Error reading pending authorizations tracker database index."
    });
  }
});

// ==========================================
// 📝 4. PATCH/PUT: EXECUTE HR/ADMIN STATUS MODIFICATION ACTIONS
// ==========================================
const processLeaveAction = async (req, res) => {
  const leaveId = req.params.leaveId || req.params.id;
  const status = req.body.status || req.body.action;
  const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
  if (!status) return res.status(400).json({
    message: "Parameters missing: Action or status update configuration is required."
  });
  try {
    const targetLeave = await Leave.findById(leaveId);
    if (!targetLeave) return res.status(404).json({
      message: "Leave document reference context not found."
    });
    if (requestorRole === 'hr') {
      const hrUser = await Employee.findById(req.user.id);
      const adminConfig = hrUser && hrUser.createdBy ? await Admin.findById(hrUser.createdBy) : await Admin.findOne();
      if (adminConfig && !adminConfig.isHrLeavePowerEnabled) {
        return res.status(403).json({
          message: "Action Blocked: Your management privileges are suspended by the Admin."
        });
      }
      if (targetLeave.employeeRole === 'hr') {
        return res.status(403).json({
          message: "Action Blocked: HR can only process leave rosters for standard employees."
        });
      }
    } else if (requestorRole !== 'admin') {
      return res.status(403).json({
        message: "Access Denied: Insufficient write authorization privileges."
      });
    }
    let unifiedStatus = status;
    if (status === 'Approve') unifiedStatus = 'Approved';
    if (status === 'Reject' || status === 'Decline') unifiedStatus = 'Rejected';

    // LOP Check: if approving, check employee balance for this leave type
    let isLOP = false;
    if (unifiedStatus === 'Approved') {
      const policy = await LeavePolicy.findOne({
        company: req.user.company,
        type: targetLeave.type,
        isActive: true
      });
      if (policy && !isNaN(Number(policy.annualQuota))) {
        const quota = Number(policy.annualQuota);
        // Count already approved leaves of this type for this employee in the same year
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const consumed = await Leave.aggregate([{
          $match: {
            employeeId: targetLeave.employeeId,
            type: targetLeave.type,
            status: 'Approved',
            startDate: {
              $gte: yearStart
            }
          }
        }, {
          $group: {
            _id: null,
            total: {
              $sum: '$days'
            }
          }
        }]);
        const consumedDays = consumed.length > 0 ? consumed[0].total : 0;
        const remaining = quota - consumedDays;
        if (remaining <= 0) {
          isLOP = true;
        }
      }
    }
    targetLeave.status = unifiedStatus;
    if (isLOP) {
      targetLeave.isLOP = true;
      targetLeave.isLossOfPay = true;
    }
    
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
    targetLeave.actionedByName = actionedByName;
    targetLeave.actionedByIdString = actionedByIdString;

    await targetLeave.save();

    // Generate Attendance Records for the Leave Period
    if (unifiedStatus === 'Approved') {
      const Attendance = require('../models/Attendance');
      const sDate = new Date(targetLeave.startDate);
      const eDate = new Date(targetLeave.endDate);
      
      // Reset time to avoid timezone issues during loop
      sDate.setUTCHours(0,0,0,0);
      eDate.setUTCHours(0,0,0,0);

      for (let d = new Date(sDate); d <= eDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const statusToSet = isLOP ? 'Absent' : 'Leave';
        
        await Attendance.findOneAndUpdate(
          { 
            company: targetLeave.company || req.user.company, 
            employeeId: targetLeave.employeeId, 
            date: { $regex: `^${dateString}` } 
          },
          { 
            $set: { 
              company: targetLeave.company || req.user.company, 
              employeeId: targetLeave.employeeId,
              date: dateString,
              status: statusToSet,
              hoursWorked: 0
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    // 🔔 NOTIFICATION: Announce Leave Status to Employee
    try {
      const Announcement = require('../models/Announcement');
      const newAnnouncement = new Announcement({
        company: targetLeave.company || req.user.company,
        title: `Leave Request ${unifiedStatus}`,
        message: `Your leave request for ${targetLeave.type} has been ${unifiedStatus}.`,
        targetAudience: 'Specific Users',
        targetUsers: [targetLeave.employeeId],
        createdBy: req.user.id
      });
      await newAnnouncement.save();
    } catch (announcementErr) {
      console.error("Failed to push leave update announcement:", announcementErr);
    }
    res.status(200).json({
      message: `Leave application status successfully updated to ${unifiedStatus}.`,
      isLOP
    });
  } catch (err) {
    console.error("Action execution database pipeline failure:", err);
    res.status(500).json({
      message: "Failed to write authorization mutation to file data columns."
    });
  }
};
router.put('/action/:leaveId', verifyToken, processLeaveAction);
router.patch('/:leaveId/action', verifyToken, processLeaveAction);

// ==========================================
// 📋 5. GET: FETCH USER BALANCES & PERSONAL LEAVE HISTORY
// ==========================================
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const history = await Leave.find({
      company: req.user.company,
      employeeId: req.user.id
    }).sort({
      createdAt: -1
    });
    const emp = await Employee.findById(req.user.id);
    const defaultBalances = { casual: 12, medical: 10, paid: 15 };
    const balances = emp && emp.leaveBalances ? emp.leaveBalances : defaultBalances;

    res.status(200).json({
      balances,
      history
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error syncing leave ledger records."
    });
  }
});

// ==========================================
// 🚀 6. POST: REGISTER A NEW LEAVE REQUEST
// ==========================================
router.post('/apply', verifyToken, async (req, res) => {
  const {
    type,
    startDate,
    endDate,
    days,
    reason,
    employeeRole
  } = req.body;
  try {
    if (type === 'Resignation') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leaveDate = new Date(startDate);
      leaveDate.setHours(0, 0, 0, 0);
      const diffTime = leaveDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 25) {
        return res.status(400).json({
          message: "Resignation date must be at least 25 days in the future (notice period)."
        });
      }
    }
    const newRequest = new Leave({
      company: req.user.company,
      employeeId: req.user.id,
      employeeRole: employeeRole || req.user.role || 'employee',
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: Number(days),
      reason
    });
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error("Error pushing fresh employee application:", err);
    res.status(500).json({
      message: "Failed to dispatch leave request entry."
    });
  }
});

// ==========================================
// 8. ADMIN SETTINGS: GLOBAL POLICY & ADJUSTMENTS
// ==========================================
router.get('/policy', verifyToken, async (req, res) => {
  try {
    const settings = await CompanySettings.findOne({ company: req.user.company });
    if (!settings || !settings.leaveSettings || !settings.leaveSettings.globalLimits) {
      return res.status(200).json({ casual: 12, medical: 10, paid: 15 });
    }
    res.status(200).json(settings.leaveSettings.globalLimits);
  } catch (err) {
    res.status(500).json({ message: "Error fetching policy" });
  }
});

router.put('/policy', verifyToken, async (req, res) => {
  const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
  if (requestorRole !== 'admin' && requestorRole !== 'hr') {
    return res.status(403).json({ message: "Access Denied" });
  }
  try {
    if (requestorRole === 'hr') {
      const hrUser = await Employee.findById(req.user.id);
      const adminConfig = hrUser && hrUser.createdBy ? await Admin.findById(hrUser.createdBy) : await Admin.findOne();
      if (adminConfig && !adminConfig.isHrLeavePowerEnabled) {
        return res.status(403).json({ message: "Action Blocked: Your management privileges are suspended by the Admin." });
      }
    }
    const { casual, medical, paid } = req.body;
    let settings = await CompanySettings.findOne({ company: req.user.company });
    if (!settings) settings = new CompanySettings({ company: req.user.company, companyName: 'Company' });
    if (!settings.leaveSettings) settings.leaveSettings = {};
    settings.leaveSettings.globalLimits = { casual: Number(casual), medical: Number(medical), paid: Number(paid) };
    await settings.save();
    res.status(200).json({ message: "Global policy updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating policy" });
  }
});

router.put('/adjust-balance', verifyToken, async (req, res) => {
  const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
  if (requestorRole !== 'admin' && requestorRole !== 'hr') {
    return res.status(403).json({ message: "Access Denied" });
  }
  try {
    if (requestorRole === 'hr') {
      const hrUser = await Employee.findById(req.user.id);
      const adminConfig = hrUser && hrUser.createdBy ? await Admin.findById(hrUser.createdBy) : await Admin.findOne();
      if (adminConfig && !adminConfig.isHrLeavePowerEnabled) {
        return res.status(403).json({ message: "Action Blocked: Your management privileges are suspended by the Admin." });
      }
    }
    const { employeeId, category, days, operation } = req.body; // operation: 'Add' or 'Deduct'
    const emp = await Employee.findOne({ company: req.user.company, empId: employeeId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    
    const catLower = category.toLowerCase();
    let currentBal = emp.leaveBalances?.[catLower] || 0;
    let delta = Number(days);
    if (operation === 'Deduct') delta = -delta;
    
    if (!emp.leaveBalances) {
      emp.leaveBalances = { casual: 12, medical: 10, paid: 15 };
    }
    emp.leaveBalances[catLower] = Math.max(0, currentBal + delta); // Prevent negative balance
    await emp.save();
    
    res.status(200).json({ message: "Balance adjusted successfully", newBalance: emp.leaveBalances[catLower] });
  } catch (err) {
    res.status(500).json({ message: "Error adjusting balance" });
  }
});

// ==========================================
// 📅 7. GET: UNIFIED CALENDAR DATA (Leaves + Holidays)
// ==========================================
router.get('/calendar', verifyToken, async (req, res) => {
  try {
    const {
      start,
      end
    } = req.query; // optional date bounds
    const company = req.user.company;
    let leaveQuery = {
      company,
      status: 'Approved'
    };
    let holidayQuery = {
      company,
      isActive: true
    };
    if (start && end) {
      leaveQuery.$or = [{
        startDate: {
          $gte: start,
          $lte: end
        }
      }, {
        endDate: {
          $gte: start,
          $lte: end
        }
      }];
      holidayQuery.date = {
        $gte: start,
        $lte: end
      };
    }
    const [leaves, holidays] = await Promise.all([Leave.find({
      ...leaveQuery,
      company: req.user.company
    }).populate('employeeId', 'name empId department'), Holiday.find({
      ...holidayQuery,
      company: req.user.company
    })]);
    const calendarEvents = [];

    // Format leaves as events
    leaves.forEach(leave => {
      if (!leave.employeeId) return;
      calendarEvents.push({
        id: `leave_${leave._id}`,
        title: `${leave.employeeId.name} - ${leave.type}`,
        start: new Date(leave.startDate),
        end: new Date(new Date(leave.endDate).getTime() + 86400000),
        // add 1 day for inclusive UI rendering
        type: 'leave',
        resource: leave
      });
    });

    // Format holidays as events
    holidays.forEach(holiday => {
      calendarEvents.push({
        id: `holiday_${holiday._id}`,
        title: `🎉 ${holiday.name}`,
        start: new Date(holiday.date),
        end: new Date(new Date(holiday.date).getTime() + 86400000),
        // add 1 day
        type: 'holiday',
        resource: holiday
      });
    });
    res.status(200).json(calendarEvents);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({
      message: "Failed to load calendar events."
    });
  }
});
// 📅 7. GET: UNIFIED CALENDAR DATA (Leaves + Holidays)
// ==========================================
router.get('/calendar', verifyToken, async (req, res) => {
  try {
    const {
      start,
      end
    } = req.query; // optional date bounds
    const company = req.user.company;
    let leaveQuery = {
      company,
      status: 'Approved'
    };
    let holidayQuery = {
      company,
      isActive: true
    };
    if (start && end) {
      leaveQuery.$or = [{
        startDate: {
          $gte: start,
          $lte: end
        }
      }, {
        endDate: {
          $gte: start,
          $lte: end
        }
      }];
      holidayQuery.date = {
        $gte: start,
        $lte: end
      };
    }
    const [leaves, holidays] = await Promise.all([Leave.find({
      ...leaveQuery,
      company: req.user.company
    }).populate('employeeId', 'name empId department'), Holiday.find({
      ...holidayQuery,
      company: req.user.company
    })]);
    const calendarEvents = [];

    // Format leaves as events
    leaves.forEach(leave => {
      if (!leave.employeeId) return;
      calendarEvents.push({
        id: `leave_${leave._id}`,
        title: `${leave.employeeId.name} - ${leave.type}`,
        start: new Date(leave.startDate),
        end: new Date(new Date(leave.endDate).getTime() + 86400000),
        // add 1 day for inclusive UI rendering
        type: 'leave',
        resource: leave
      });
    });

    // Format holidays as events
    holidays.forEach(holiday => {
      calendarEvents.push({
        id: `holiday_${holiday._id}`,
        title: `🎉 ${holiday.name}`,
        start: new Date(holiday.date),
        end: new Date(new Date(holiday.date).getTime() + 86400000),
        // add 1 day
        type: 'holiday',
        resource: holiday
      });
    });
    res.status(200).json(calendarEvents);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({
      message: "Failed to load calendar events."
    });
  }
});

// ==========================================
// ✏️ 7. PUT: EDIT LEAVE REQUEST
// ==========================================
router.put('/:leaveId', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    const leave = await Leave.findById(req.params.leaveId);
    if (!leave) return res.status(404).json({ message: "Leave request not found." });

    // Allow Admin, HR, or the employee who owns the leave request
    if (userRole !== 'admin' && userRole !== 'hr' && leave.employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Access Denied: You cannot edit this leave request." });
    }

    const { type, startDate, endDate, days, reason } = req.body;
    if (type) leave.type = type;
    if (startDate) leave.startDate = startDate;
    if (endDate) leave.endDate = endDate;
    if (days) leave.days = days;
    if (reason !== undefined) leave.reason = reason;

    const updatedLeave = await leave.save();
    res.status(200).json(updatedLeave);
  } catch (err) {
    res.status(500).json({ message: "Failed to update leave request: " + err.message });
  }
});

// ==========================================
// 🚀 8. DELETE: CANCEL / DELETE LEAVE REQUEST
// ==========================================
router.delete('/:leaveId', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'employee';
    const leave = await Leave.findById(req.params.leaveId);
    if (!leave) return res.status(404).json({ message: "Leave request not found." });

    // Allow Admin, HR, or the employee who owns the leave request
    if (userRole !== 'admin' && userRole !== 'hr' && leave.employeeId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Access Denied: You cannot delete this leave request." });
    }

    await Leave.findByIdAndDelete(req.params.leaveId);
    res.status(200).json({ message: "Leave request deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete leave request: " + err.message });
  }
});


module.exports = router;