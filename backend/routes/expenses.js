const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Expense = require('../models/Expense');
const PettyCash = require('../models/PettyCash');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// GET all expenses (company-scoped or employee-scoped)
router.get('/', verifyToken, async (req, res) => {
  try {
    let filter = {
      company: req.user.company
    };
    if (req.query.mine === 'true') {
      const Employee = require('../models/Employee');
      const emp = await Employee.findById(req.user.id);
      if (emp) filter.employeeId = emp._id;
    }
    const expenses = await Expense.find({
      ...filter,
      company: req.user.company
    }).populate('employeeId', 'name empId department').populate('approvedBy', 'name');
    const cleanExpenses = expenses.map(exp => {
      const expObj = exp.toObject();
      if (expObj.receipt && expObj.receipt.data) {
        expObj.hasReceipt = true;
        delete expObj.receipt.data;
      } else {
        expObj.hasReceipt = false;
      }
      return expObj;
    });
    res.status(200).json(cleanExpenses);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET receipt
router.get('/:id/receipt', verifyToken, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    if (!expense || !expense.receipt || !expense.receipt.data) {
      return res.status(404).json({
        message: 'Receipt not found'
      });
    }
    res.set('Content-Type', expense.receipt.contentType);
    res.send(expense.receipt.data);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CREATE expense
router.post('/', verifyToken, upload.single('receipt'), async (req, res) => {
  try {
    const {
      employeeId,
      category,
      amount,
      dateIncurred,
      description,
      status
    } = req.body;
    const numAmount = Number(amount);

    // Fetch company settings to check for limits
    const CompanySettings = require('../models/CompanySettings');
    const settings = await CompanySettings.findOne({ company: req.user.company });
    if (settings && settings.expenseLimits) {
      let limitKey = category;
      if (category === 'Office Supplies') limitKey = 'OfficeSupplies';
      const limit = settings.expenseLimits[category] !== undefined ? settings.expenseLimits[category] : settings.expenseLimits[limitKey];
      if (limit && limit > 0 && numAmount > limit) {
        return res.status(400).json({
          message: `Expense amount exceeds the maximum limit (₹${limit}) for ${category}.`
        });
      }
    }
    const targetEmployeeId = employeeId || req.user.id;
    const expenseData = {
      company: req.user.company,
      employeeId: targetEmployeeId,
      category,
      amount: numAmount,
      dateIncurred,
      description,
      status
    };
    if (req.file) {
      expenseData.receipt = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    const newExpense = new Expense(expenseData);
    const savedExpense = await newExpense.save();
    res.status(201).json({
      message: 'Expense added successfully',
      id: savedExpense._id
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPDATE status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const {
      status
    } = req.body;
    const updatedExpense = await Expense.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      status,
      approvedBy: req.user.id
    }, {
      new: true
    }).populate('employeeId', 'name empId');
    res.status(200).json(updatedExpense);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE expense
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Expense.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
    res.status(200).json({
      message: 'Expense deleted'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// PETTY CASH
router.get('/pettycash', verifyToken, async (req, res) => {
  try {
    const ledger = await PettyCash.find({
      company: req.user.company
    }).populate('employeeId', 'name empId department');
    res.status(200).json(ledger);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/pettycash', verifyToken, async (req, res) => {
  try {
    const {
      employeeId,
      amount,
      dateIssued,
      purpose
    } = req.body;
    const newPC = new PettyCash({
      company: req.user.company,
      employeeId,
      amount,
      dateIssued,
      purpose
    });
    const savedPC = await newPC.save();
    res.status(201).json(savedPC);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/pettycash/:id/settle', verifyToken, async (req, res) => {
  try {
    const {
      balanceReturned
    } = req.body;
    const updated = await PettyCash.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      status: 'Settled',
      settledDate: new Date(),
      balanceReturned: balanceReturned || 0
    }, {
      new: true
    });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;