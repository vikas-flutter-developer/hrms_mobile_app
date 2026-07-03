const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const ComplianceRecord = require('../models/ComplianceRecord');
const LabourCompliance = require('../models/LabourCompliance');
const ComplianceDocument = require('../models/ComplianceDocument');
const Employee = require('../models/Employee');
const Payslip = require('../models/Payslip');

// ─── Multer setup for compliance documents ───────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/compliance-docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {
  recursive: true
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage
});

// ─── Existing Compliance Record Routes ───────────────────────────────────────

// GET all compliance records
router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await ComplianceRecord.find({
      company: req.user.company
    }).sort({
      dueDate: 1
    });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CREATE new compliance record
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      dueDate,
      status,
      amountPaid,
      penalty
    } = req.body;
    const newRecord = new ComplianceRecord({
      company: req.user.company,
      type,
      title,
      description,
      dueDate,
      status,
      amountPaid,
      penalty,
      recordedBy: req.user.id
    });
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPDATE compliance status (e.g., mark as filed)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedRecord = await ComplianceRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedRecord);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPLOAD CHALLAN for a compliance record
router.put('/:id/upload-challan', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const relativePath = `/uploads/compliance-docs/${req.file.filename}`;
    const updated = await ComplianceRecord.findByIdAndUpdate(
      req.params.id,
      {
        documentUrl: relativePath,
        status: 'Filed',
        filingDate: new Date()
      },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Labour Law Compliance ────────────────────────────────────────────────────

// GET all labour law compliance items
router.get('/labour-laws', verifyToken, async (req, res) => {
  try {
    const items = await LabourCompliance.find({
      company: req.user.company
    }).sort({
      createdAt: 1
    });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// POST create or update a labour law compliance item
router.post('/labour-laws', verifyToken, async (req, res) => {
  try {
    const {
      law,
      description,
      frequency,
      lastChecked,
      nextDueDate,
      status,
      notes
    } = req.body;

    // Upsert by law name so pre-populated laws are just updated
    const item = await LabourCompliance.findOneAndUpdate({
      law
    }, {
      law,
      description,
      frequency,
      lastChecked,
      nextDueDate,
      status,
      notes
    }, {
      new: true,
      upsert: true,
      runValidators: true
    });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ─── Gratuity Report ─────────────────────────────────────────────────────────

router.get('/gratuity-report', verifyToken, async (req, res) => {
  try {
    const employees = await Employee.find({
      company: req.user.company,
      joinDate: {
        $exists: true,
        $ne: null
      }
    }).select('name empId joinDate department gratuityPercentage positionLevel salary baseSalary');

    const CustomRole = require('../models/CustomRole');
    const customRoles = await CustomRole.find({ company: req.user.company });
    const designationMap = {};
    for (const role of customRoles) {
      designationMap[role.title] = role;
    }

    const now = new Date();
    const report = [];
    for (const emp of employees) {
      const joinDate = new Date(emp.joinDate);
      const diffMs = now - joinDate;
      const yearsOfService = diffMs / (1000 * 60 * 60 * 24 * 365.25);

      const employeeDesignation = designationMap[emp.positionLevel] || {};
      const gratuityPct = employeeDesignation.gratuityPercentage || emp.gratuityPercentage || 0;

      // Fetch last processed payslip or fall back to profile salary
      const lastPayslip = await Payslip.findOne({
        employeeId: emp._id,
        status: {
          $in: ['Processed', 'Paid']
        }
      }, 'netPay basicPay').sort({
        createdAt: -1
      });
      const lastSalary = lastPayslip ? (lastPayslip.basicPay || lastPayslip.netPay) : (emp.salary || emp.baseSalary || 60000);
      const years = Math.max(0, Math.floor(yearsOfService));

      // Dynamic Gratuity Rule
      let gratuityAmount = 0;
      if (gratuityPct > 0) {
        gratuityAmount = parseFloat((lastSalary * (gratuityPct / 100)).toFixed(2));
      } else {
        gratuityAmount = parseFloat((lastSalary * 15 / 26 * years).toFixed(2));
      }

      const eligible = yearsOfService >= 5;

      report.push({
        name: emp.name,
        empId: emp.empId,
        department: emp.department || '-',
        yearsOfService: parseFloat(yearsOfService.toFixed(2)),
        lastSalary,
        gratuityAmount,
        eligible
      });
    }
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ─── Compliance Documents ─────────────────────────────────────────────────────

// GET all compliance documents
router.get('/documents', verifyToken, async (req, res) => {
  try {
    const docs = await ComplianceDocument.find({
      company: req.user.company
    }).populate('uploadedBy', 'name').sort({
      createdAt: -1
    });
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// POST upload a compliance document
router.post('/documents', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({
      message: 'No file uploaded'
    });
    const {
      title,
      category,
      expiryDate
    } = req.body;
    const doc = new ComplianceDocument({
      company: req.user.company,
      title,
      category,
      filePath: req.file.path,
      uploadedBy: req.user.id,
      expiryDate: expiryDate || null
    });
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE a compliance document
router.delete('/documents/:id', verifyToken, async (req, res) => {
  try {
    const doc = await ComplianceDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({
      message: 'Document not found'
    });

    // Remove physical file
    if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await ComplianceDocument.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DOWNLOAD / VIEW a compliance document
router.get('/documents/:id/download', verifyToken, async (req, res) => {
  try {
    const doc = await ComplianceDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({
      message: 'Document not found'
    });
    if (!fs.existsSync(doc.filePath)) return res.status(404).json({
      message: 'File not found on disk'
    });
    res.download(doc.filePath, path.basename(doc.filePath));
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;