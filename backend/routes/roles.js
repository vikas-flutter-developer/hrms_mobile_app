const express = require('express');
const router = express.Router();
const CustomRole = require('../models/CustomRole');
const verifyToken = require('../middleware/auth');
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await CustomRole.find({
      company: req.user.company
    }).populate('reportsTo', 'title');
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      level,
      salaryGrade,
      reportsTo,
      gratuityPercentage,
      id
    } = req.body;
    const target = title?.trim();
    if (!target) return res.status(400).json({
      message: 'Missing Role Title parameter'
    });
    const updateData = {
      title: target,
      level: level !== undefined ? level : 5,
      salaryGrade: salaryGrade || '',
      gratuityPercentage: gratuityPercentage !== undefined ? gratuityPercentage : 0,
      reportsTo: reportsTo || null,
      company: req.user.company
    };
    const query = id ? {
      _id: id,
      company: req.user.company
    } : {
      title: target,
      company: req.user.company
    };
    const added = await CustomRole.findOneAndUpdate(query, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }).populate('reportsTo', 'title');
    res.status(201).json(added);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/', verifyToken, async (req, res) => {
  try {
    const {
      title
    } = req.body;
    if (title === 'employee' || title === 'hr') {
      return res.status(400).json({
        message: "Core system roles cannot be deleted"
      });
    }
    await CustomRole.deleteOne({
      title: title.toLowerCase()
    });
    res.status(200).json({
      message: "Role removed successfully"
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;