const express = require('express');
const router = express.Router();
const MasterData = require('../models/MasterData');
const verifyToken = require('../middleware/auth');
const { seedTemplateToAllCompanies, seedTemplateToCompany } = require('../utils/masterDataSeeder');
const checkSuperAdminRole = require('../middleware/superAdminRbac');

const contentProtector = checkSuperAdminRole(['Owner', 'Content']);

const superAdminContentOrAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') {
    return contentProtector(req, res, next);
  }
  next();
};

// 1. CREATE New Master Data Entry
router.post('/', verifyToken, superAdminContentOrAdmin, async (req, res) => {
  try {
    const {
      category,
      name,
      description,
      isActive,
      code,
      capacity,
      gratuityPercentage,
      salaryGrade,
      level,
      annualQuota,
      holidayDate
    } = req.body;

    // Set companyId based on role
    const companyId = req.user.role === 'superadmin' ? null : req.user.company;

    const newData = new MasterData({
      category,
      name,
      description,
      isActive,
      companyId,
      code: code || '',
      capacity: Number(capacity || 0),
      gratuityPercentage: Number(gratuityPercentage || 0),
      salaryGrade: salaryGrade || '',
      level: Number(level || 5),
      annualQuota: Number(annualQuota || 0),
      holidayDate: holidayDate || null
    });
    await newData.save();
    
    // If it's a global template (no companyId), seed it to all existing companies
    if (!companyId) {
      await seedTemplateToAllCompanies(newData);
    } else {
      // Seed it to the local company collections (Designation -> CustomRole, etc.)
      await seedTemplateToCompany(newData, companyId);
    }

    res.status(201).json({
      message: `${category} created successfully`,
      data: newData
    });
  } catch (err) {
    res.status(500).json({
      message: "Error saving data",
      error: err.message
    });
  }
});

// 2. READ ALL Master Data (Category wise filter + Merges SuperAdmin Global + Company Custom)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};

    if (req.user.role === 'superadmin') {
      filter = category ? { category, companyId: null } : { companyId: null };
    } else {
      filter = category ? {
        category,
        $or: [{ companyId: null }, { companyId: req.user.company }]
      } : {
        $or: [{ companyId: null }, { companyId: req.user.company }]
      };
    }

    const data = await MasterData.find(filter).sort({ createdAt: -1 });
    if (req.user.role !== 'superadmin') {
      const sortedData = [...data].sort((a, b) => {
        if (a.companyId === null && b.companyId !== null) return -1;
        if (a.companyId !== null && b.companyId === null) return 1;
        return 0;
      });
      const mergedMap = new Map();
      for (const item of sortedData) {
        mergedMap.set(item.name.toLowerCase(), item);
      }
      res.status(200).json(Array.from(mergedMap.values()).filter(item => item.isActive));
    } else {
      res.status(200).json(data);
    }
  } catch (err) {
    res.status(500).json({
      message: "Error fetching data",
      error: err.message
    });
  }
});

// 3. UPDATE Master Data
router.put('/:id', verifyToken, superAdminContentOrAdmin, async (req, res) => {
  try {
    const record = await MasterData.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    // Restrict access if not superadmin and doesn't match companyId
    if (req.user.role !== 'superadmin' && String(record.companyId) !== String(req.user.company)) {
      return res.status(403).json({ message: "Forbidden: Cannot update this template" });
    }

    const updatedData = await MasterData.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json({
      message: "Updated successfully",
      data: updatedData
    });
  } catch (err) {
    res.status(500).json({
      message: "Error updating data",
      error: err.message
    });
  }
});

// 4. DELETE Master Data
router.delete('/:id', verifyToken, superAdminContentOrAdmin, async (req, res) => {
  try {
    const record = await MasterData.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    // Restrict access if not superadmin and doesn't match companyId
    if (req.user.role !== 'superadmin' && String(record.companyId) !== String(req.user.company)) {
      return res.status(403).json({ message: "Forbidden: Cannot delete this template" });
    }

    await MasterData.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting data",
      error: err.message
    });
  }
});

module.exports = router;