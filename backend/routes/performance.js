const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

// Models
const KPI = require('../models/KPI');
const PerformanceCycle = require('../models/PerformanceCycle');
const PerformanceReview = require('../models/PerformanceReview');
const Feedback = require('../models/Feedback');
const PIP = require('../models/PIP');
const AppraisalHistory = require('../models/AppraisalHistory');

// =======================
// KPI Routes
// =======================

router.get('/kpis', verifyToken, async (req, res) => {
  try {
    const kpis = await KPI.find({
      company: req.user.company
    }).populate('employee', 'name empId department').populate('createdBy', 'name');
    res.status(200).json(kpis);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/kpis', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      employee,
      department,
      unit,
      targetValue,
      baseline,
      weight,
      frequency
    } = req.body;
    const newKPI = new KPI({
      company: req.user.company,
      title,
      description,
      employee,
      department,
      unit,
      targetValue,
      baseline,
      weight,
      frequency,
      createdBy: req.user.id // Assuming auth middleware sets req.user
    });
    const savedKPI = await newKPI.save();
    res.status(201).json(savedKPI);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/kpis/:id', verifyToken, async (req, res) => {
  try {
    const updatedKPI = await KPI.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedKPI);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/kpis/:id', verifyToken, async (req, res) => {
  try {
    await KPI.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'KPI deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.get('/my-kpis', verifyToken, async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({
      message: 'Employee not found'
    });
    const kpis = await KPI.find({
      company: req.user.company,
      employee: emp._id
    }).populate('employee', 'name empId department').populate('createdBy', 'name');
    res.status(200).json(kpis);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Performance Cycle Routes
// =======================

router.get('/cycles', verifyToken, async (req, res) => {
  try {
    const cycles = await PerformanceCycle.find({
      company: req.user.company
    }).populate('createdBy', 'name');
    res.status(200).json(cycles);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/cycles', verifyToken, async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      description,
      status
    } = req.body;
    const newCycle = new PerformanceCycle({
      company: req.user.company,
      name,
      startDate,
      endDate,
      description,
      status,
      createdBy: req.user.id
    });
    const savedCycle = await newCycle.save();
    res.status(201).json(savedCycle);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/cycles/:id', verifyToken, async (req, res) => {
  try {
    const updatedCycle = await PerformanceCycle.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedCycle);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/cycles/:id', verifyToken, async (req, res) => {
  try {
    await PerformanceCycle.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Performance Cycle deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Performance Review Routes
// =======================

router.get('/reviews', verifyToken, async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({
      company: req.user.company
    }).populate('employee', 'name empId department').populate('cycle', 'name startDate endDate').populate('reviewer', 'name').populate('manager', 'name').populate('kpiAssessments');
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/reviews', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      cycle,
      reviewer,
      manager,
      selfAppraisal,
      managerAppraisal,
      kpiAssessments,
      rating,
      status,
      overallComments
    } = req.body;
    const newReview = new PerformanceReview({
      company: req.user.company,
      employee,
      cycle,
      reviewer,
      manager,
      selfAppraisal,
      managerAppraisal,
      kpiAssessments,
      rating,
      status,
      overallComments,
      createdBy: req.user.id
    });
    const savedReview = await newReview.save();
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/reviews/:id', verifyToken, async (req, res) => {
  try {
    const updatedReview = await PerformanceReview.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedReview);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/reviews/:id', verifyToken, async (req, res) => {
  try {
    await PerformanceReview.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Performance Review deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Feedback (360-degree) Routes
// =======================

router.get('/feedbacks', verifyToken, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      company: req.user.company
    }).populate('employee', 'name empId').populate('provider', 'name role').populate('cycle', 'name');
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/feedbacks', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      provider,
      cycle,
      comments,
      rating,
      type
    } = req.body;
    const newFeedback = new Feedback({
      employee,
      provider,
      cycle,
      comments,
      rating,
      type
    });
    const savedFeedback = await newFeedback.save();
    res.status(201).json(savedFeedback);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// PIP Routes
// =======================

router.get('/pips', verifyToken, async (req, res) => {
  try {
    const pips = await PIP.find({
      company: req.user.company
    }).populate('employee', 'name empId').populate('manager', 'name');
    res.status(200).json(pips);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/pips', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      manager,
      reason,
      goals,
      startDate,
      endDate,
      status,
      comments
    } = req.body;
    const newPIP = new PIP({
      company: req.user.company,
      employee,
      manager,
      reason,
      goals,
      startDate,
      endDate,
      status,
      comments,
      createdBy: req.user.id
    });
    const savedPIP = await newPIP.save();
    res.status(201).json(savedPIP);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/pips/:id', verifyToken, async (req, res) => {
  try {
    const updatedPIP = await PIP.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedPIP);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Appraisal History Routes
// =======================

router.get('/appraisal-history', verifyToken, async (req, res) => {
  try {
    const history = await AppraisalHistory.find({
      company: req.user.company
    }).populate('employee', 'name empId department').populate('review', 'cycle rating status');
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Analytics & Reports Route
// =======================

router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({
      company: req.user.company
    }).populate('employee', 'name department');

    // Aggregate by department
    const deptStats = {};
    const employeeScores = {};
    reviews.forEach(review => {
      if (review.rating && review.employee) {
        const dept = review.employee.department || 'Unassigned';
        const empId = review.employee._id.toString();

        // Department agg
        if (!deptStats[dept]) deptStats[dept] = {
          totalRating: 0,
          count: 0
        };
        deptStats[dept].totalRating += review.rating;
        deptStats[dept].count += 1;

        // Employee agg
        if (!employeeScores[empId]) {
          employeeScores[empId] = {
            name: review.employee.name,
            department: dept,
            totalRating: 0,
            count: 0
          };
        }
        employeeScores[empId].totalRating += review.rating;
        employeeScores[empId].count += 1;
      }
    });
    const departmentAverages = Object.keys(deptStats).map(dept => ({
      department: dept,
      averageScore: (deptStats[dept].totalRating / deptStats[dept].count).toFixed(2)
    }));
    const topPerformers = Object.values(employeeScores).map(emp => ({
      name: emp.name,
      department: emp.department,
      averageScore: (emp.totalRating / emp.count).toFixed(2)
    })).sort((a, b) => b.averageScore - a.averageScore).slice(0, 5); // top 5

    res.status(200).json({
      departmentAverages,
      topPerformers
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Performance Reports Routes (C6)
// =======================

router.get('/reports/summary', verifyToken, async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({
      company: req.user.company
    }).populate('employee', 'name department');
    const deptStats = {};
    reviews.forEach(review => {
      if (review.rating && review.employee) {
        const dept = review.employee.department || 'Unassigned';
        if (!deptStats[dept]) deptStats[dept] = {
          totalRating: 0,
          count: 0
        };
        deptStats[dept].totalRating += review.rating;
        deptStats[dept].count += 1;
      }
    });
    const departmentAverages = Object.keys(deptStats).map(dept => ({
      department: dept,
      averageScore: parseFloat((deptStats[dept].totalRating / deptStats[dept].count).toFixed(2)),
      reviewCount: deptStats[dept].count
    }));
    res.status(200).json({
      departmentAverages
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.get('/reports/top-performers', verifyToken, async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({
      company: req.user.company
    }).populate('employee', 'name department empId');
    const employeeScores = {};
    reviews.forEach(review => {
      if (review.rating && review.employee) {
        const empId = review.employee._id.toString();
        if (!employeeScores[empId]) {
          employeeScores[empId] = {
            name: review.employee.name,
            department: review.employee.department || 'Unassigned',
            empId: review.employee.empId,
            totalRating: 0,
            count: 0
          };
        }
        employeeScores[empId].totalRating += review.rating;
        employeeScores[empId].count += 1;
      }
    });
    const topPerformers = Object.values(employeeScores).map(emp => ({
      ...emp,
      averageScore: parseFloat((emp.totalRating / emp.count).toFixed(2))
    })).sort((a, b) => b.averageScore - a.averageScore).slice(0, 5);
    res.status(200).json({
      topPerformers
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;