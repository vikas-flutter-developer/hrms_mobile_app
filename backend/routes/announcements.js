const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Announcement = require('../models/Announcement');

// GET all announcements (admin sees all; filtered for employees/HR by department or individual targeting)
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};

    // If the token belongs to employee or HR, filter appropriately
    if (req.user && req.user.role !== 'admin') {
      const dept = req.user.department;
      const userId = req.user.id;
      query = {
        $or: [
          { targetAudience: 'All' },
          { targetAudience: 'Specific Department', targetDepartments: dept },
          { targetAudience: 'Specific Users', targetUsers: userId }
        ]
      };
    }
    const announcements = await Announcement.find({
      ...query,
      company: req.user.company
    }).populate('createdBy', 'name').sort({
      createdAt: -1
    });
    res.status(200).json(announcements);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CREATE new announcement
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      message,
      targetAudience,
      targetDepartments,
      targetUsers
    } = req.body;
    const createdByModel = req.user.role === 'admin' ? 'Admin' : 'Employee';
    const newAnnouncement = new Announcement({
      company: req.user.company,
      title,
      message,
      targetAudience: targetAudience || 'All',
      targetDepartments: Array.isArray(targetDepartments) ? targetDepartments : [],
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
      createdBy: req.user.id,
      createdByModel
    });
    const savedAnnouncement = await newAnnouncement.save();
    await savedAnnouncement.populate('createdBy', 'name');
    res.status(201).json(savedAnnouncement);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE announcement
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Announcement deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;