const express = require('express');
const router = express.Router();
const LeavePolicy = require('../models/LeavePolicy');
const verifyToken = require('../middleware/auth');

// GET all policies
router.get('/', verifyToken, async (req, res) => {
  try {
    const policies = await LeavePolicy.find({
      company: req.user.company,
      isActive: true
    }).sort({
      createdAt: -1
    });
    res.status(200).json(policies);
  } catch (err) {
    console.error("Policy fetch error:", err);
    res.status(500).json({
      message: 'Failed to fetch policies'
    });
  }
});

// POST new policy
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({
      message: "Admin access required"
    });
    const newPolicy = new LeavePolicy({
      ...req.body,
      company: req.user.company
    });
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (err) {
    console.error("Policy create error:", err);
    res.status(500).json({
      message: 'Failed to create policy'
    });
  }
});

// PUT update policy
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({
      message: "Admin access required"
    });
    const updatedPolicy = await LeavePolicy.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, req.body, {
      new: true
    });
    res.status(200).json(updatedPolicy);
  } catch (err) {
    console.error("Policy update error:", err);
    res.status(500).json({
      message: 'Failed to update policy'
    });
  }
});

// DELETE policy (Soft delete by setting isActive to false)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({
      message: "Admin access required"
    });
    await LeavePolicy.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      isActive: false
    });
    res.status(200).json({
      message: 'Policy deactivated successfully'
    });
  } catch (err) {
    console.error("Policy delete error:", err);
    res.status(500).json({
      message: 'Failed to delete policy'
    });
  }
});
module.exports = router;