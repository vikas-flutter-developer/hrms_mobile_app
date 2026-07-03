const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Loan = require('../models/Loan');
const Employee = require('../models/Employee');
const isHrOrAdmin = role => {
  const normalized = role ? String(role).toLowerCase() : 'employee';
  return normalized === 'admin' || normalized === 'hr';
};

// GET: All loan requests (admin/hr)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const loans = await Loan.find({
      company: req.user.company
    }).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    });
    res.status(200).json(loans);
  } catch (err) {
    console.error('Loans fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch loans.'
    });
  }
});

// GET: Loans for a specific employee
router.get('/employee/:empId', verifyToken, async (req, res) => {
  try {
    const loans = await Loan.find({
      company: req.user.company,
      employeeId: req.params.empId
    }).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    });
    res.status(200).json(loans);
  } catch (err) {
    console.error('Employee loans fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch employee loans.'
    });
  }
});

// POST: Create a loan request
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      amount,
      tenure,
      reason
    } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({
        message: 'amount and reason are required.'
      });
    }
    const employeeId = employee || req.user.id;
    const months = tenure && tenure > 0 ? tenure : 12;
    const emiAmount = Math.ceil(amount / months);
    const loan = new Loan({
      company: req.user.company,
      company: req.user.company,
      employeeId,
      amount: Number(amount),
      reason,
      emiAmount,
      balanceRemaining: Number(amount),
      status: 'Pending'
    });
    await loan.save();
    const populated = await loan.populate('employeeId', 'name empId department');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Loan create error:', err);
    res.status(500).json({
      message: 'Failed to create loan request.'
    });
  }
});

// PUT: Approve a loan
router.put('/:id/approve', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({
      message: 'Loan not found.'
    });
    const {
      tenure
    } = req.body;
    const months = tenure && tenure > 0 ? tenure : Math.ceil(loan.amount / loan.emiAmount) || 12;
    loan.emiAmount = Math.ceil(loan.amount / months);
    loan.status = 'Approved';
    loan.disbursementDate = new Date();
    loan.approvedBy = req.user.id;
    await loan.save();
    res.status(200).json({
      message: 'Loan approved.',
      loan
    });
  } catch (err) {
    console.error('Loan approve error:', err);
    res.status(500).json({
      message: 'Failed to approve loan.'
    });
  }
});

// PUT: Reject a loan
router.put('/:id/reject', verifyToken, async (req, res) => {
  try {
    if (!isHrOrAdmin(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }
    const loan = await Loan.findByIdAndUpdate(req.params.id, {
      status: 'Rejected'
    }, {
      new: true
    });
    if (!loan) return res.status(404).json({
      message: 'Loan not found.'
    });
    res.status(200).json({
      message: 'Loan rejected.',
      loan
    });
  } catch (err) {
    console.error('Loan reject error:', err);
    res.status(500).json({
      message: 'Failed to reject loan.'
    });
  }
});
module.exports = router;