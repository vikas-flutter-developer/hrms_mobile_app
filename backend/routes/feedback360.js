const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const mongoose = require('mongoose');

// Use the existing Feedback model but it only has reviewee/reviewer/relation/comments/rating/cycle
// We'll create an extended schema for 360 feedback stored in a separate collection
const Feedback360Schema = new mongoose.Schema({
  forEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  fromEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  fromRole: {
    type: String,
    enum: ['Self', 'Peer', 'Manager', 'Subordinate'],
    default: 'Peer'
  },
  ratings: {
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    teamwork: {
      type: Number,
      min: 1,
      max: 5
    },
    leadership: {
      type: Number,
      min: 1,
      max: 5
    },
    technical: {
      type: Number,
      min: 1,
      max: 5
    },
    attitude: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  comments: {
    type: String
  }
}, {
  timestamps: true
});
const Feedback360 = mongoose.models.Feedback360 || mongoose.model('Feedback360', Feedback360Schema);

// =======================
// POST /api/feedback360 — Submit 360 feedback
// =======================
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      forEmployee,
      fromEmployee,
      fromRole,
      ratings,
      overallRating,
      comments
    } = req.body;
    const feedback = new Feedback360({
      forEmployee,
      fromEmployee,
      fromRole,
      ratings,
      overallRating,
      comments
    });
    const saved = await feedback.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// GET /api/feedback360/employee/:empId — All feedback for employee
// =======================
router.get('/employee/:empId', verifyToken, async (req, res) => {
  try {
    const feedbacks = await Feedback360.find({
      company: req.user.company,
      forEmployee: req.params.empId
    }).populate('fromEmployee', 'name department role').sort({
      createdAt: -1
    });
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// GET /api/feedback360/summary/:empId — Averaged scores per category
// =======================
router.get('/summary/:empId', verifyToken, async (req, res) => {
  try {
    const feedbacks = await Feedback360.find({
      company: req.user.company,
      forEmployee: req.params.empId
    }).lean();
    if (!feedbacks.length) return res.status(200).json({
      count: 0,
      averages: {},
      overallAvg: 0
    });
    const categories = ['communication', 'teamwork', 'leadership', 'technical', 'attitude'];
    const totals = {
      communication: 0,
      teamwork: 0,
      leadership: 0,
      technical: 0,
      attitude: 0
    };
    let overallTotal = 0;
    let ratingCount = 0;
    feedbacks.forEach(fb => {
      if (fb.ratings) {
        categories.forEach(cat => {
          if (fb.ratings[cat]) totals[cat] += fb.ratings[cat];
        });
      }
      if (fb.overallRating) {
        overallTotal += fb.overallRating;
        ratingCount++;
      }
    });
    const averages = {};
    categories.forEach(cat => {
      averages[cat] = feedbacks.length > 0 ? (totals[cat] / feedbacks.length).toFixed(1) : 0;
    });
    res.status(200).json({
      count: feedbacks.length,
      averages,
      overallAvg: ratingCount > 0 ? (overallTotal / ratingCount).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;