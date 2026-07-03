const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Shift = require('../models/Shift');
const Employee = require('../models/Employee');
const isHrOrAdmin = role => {
  const normalized = role ? String(role).toLowerCase() : 'employee';
  return normalized === 'admin' || normalized === 'hr';
};

// GET: List all shifts
router.get('/', verifyToken, async (req, res) => {
  try {
    const shifts = await Shift.find({
      company: req.user.company
    }).sort({
      createdAt: -1
    });
    res.status(200).json(shifts);
  } catch (err) {
    console.error('Shifts fetch error', err);
    res.status(500).json({
      message: 'Unable to fetch shifts.'
    });
  }
});

// POST: Create a shift
router.post('/', verifyToken, async (req, res) => {
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
      nightShiftAllowancePercent,
      workDays,
      allowances
    } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        message: 'name, startTime, and endTime are required.'
      });
    }
    const shift = new Shift({
      company: req.user.company,
      company: req.user.company,
      name,
      startTime,
      endTime,
      totalHours: totalHours || 8,
      rotationCycle: rotationCycle || 'None',
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

// PUT: Update a shift
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!shift) return res.status(404).json({
      message: 'Shift not found.'
    });
    res.status(200).json(shift);
  } catch (err) {
    console.error('Update shift error', err);
    res.status(500).json({
      message: 'Unable to update shift.'
    });
  }
});

// DELETE: Delete a shift
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) return res.status(404).json({
      message: 'Shift not found.'
    });
    // Unassign shift from employees
    await Employee.updateMany({
      shift: req.params.id
    }, {
      $set: {
        shift: null
      }
    });
    res.status(200).json({
      message: 'Shift deleted successfully.'
    });
  } catch (err) {
    console.error('Delete shift error', err);
    res.status(500).json({
      message: 'Unable to delete shift.'
    });
  }
});

// PUT: Assign shift to array of employees
router.put('/:id/assign', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const {
      employeeIds
    } = req.body;
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        message: 'employeeIds array is required.'
      });
    }
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({
      message: 'Shift not found.'
    });

    // Assign shift to employees
    await Employee.updateMany({
      _id: {
        $in: employeeIds
      }
    }, {
      $set: {
        shift: shift._id
      }
    });

    // Update assignedEmployees on shift
    const existingSet = new Set(shift.assignedEmployees.map(id => id.toString()));
    employeeIds.forEach(id => existingSet.add(id));
    shift.assignedEmployees = Array.from(existingSet);
    await shift.save();
    res.status(200).json({
      message: `Shift assigned to ${employeeIds.length} employee(s).`,
      shift
    });
  } catch (err) {
    console.error('Assign shift error', err);
    res.status(500).json({
      message: 'Unable to assign shift.'
    });
  }
});
module.exports = router;